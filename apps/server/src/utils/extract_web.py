import os
import json
import requests
import pytesseract
from unstructured.partition.html import partition_html
from PIL import Image
from typing import List, Dict, Tuple
import urllib.parse
from pathlib import Path
import logging

from utils.clean import clean_content
from utils.cache import check_extracted_cache, save_extracted_cache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
]

def download_web_images(url: str, elements: list, figures_dir: str) -> List[Dict]:
    images = []
    base_url = urllib.parse.urljoin(url, '/')
    doc_name = url.replace("://", "_").replace("/", "_")[:30]

    os.makedirs(figures_dir, exist_ok=True)

    img_count = 0
    for element in elements:
        if hasattr(element, 'metadata') and element.metadata:
            if hasattr(element.metadata, 'image_path') and element.metadata.image_path:
                try:
                    img_url = element.metadata.image_path
                    if not img_url.startswith('http'):
                        img_url = urllib.parse.urljoin(base_url, img_url)

                    response = requests.get(img_url, timeout=10)
                    if response.status_code == 200:
                        if len(response.content) < 1024:
                            continue

                        img_count += 1
                        ext = '.jpg'
                        content_type = response.headers.get('content-type', '')
                        if 'png' in content_type:
                            ext = '.png'
                        elif 'gif' in content_type:
                            ext = '.gif'

                        img_path = os.path.join(figures_dir, f"{doc_name}_img_{img_count}{ext}")

                        with open(img_path, 'wb') as f:
                            f.write(response.content)

                        ocr_text = ""
                        try:
                            with Image.open(img_path) as im:
                                if im.width < 10 or im.height < 10:
                                    continue
                                ocr_text = pytesseract.image_to_string(im).strip()
                        except Exception:
                            pass

                        images.append({
                            "path": img_path,
                            "page_number": None,
                            "caption": f"Web Image {img_count}",
                            "ocr_text": ocr_text,
                            "source_url": img_url
                        })

                except Exception:
                    continue

    return images

def save_table_screenshots_from_web(elements, output_folder="tmp/tables"):
    tables = [el for el in elements if
              (getattr(el, "category", None) == "Table" or el.get("category") == "Table" or
               getattr(el, "type", None) == "Table" or el.get("type") == "Table")]
    if not tables:
        return []

    os.makedirs(output_folder, exist_ok=True)
    doc_name = "web_document"
    table_results = []
    table_count = 0

    for el in elements:
        category = el.get("category") if isinstance(el, dict) else getattr(el, "category", None)
        element_type = el.get("type") if isinstance(el, dict) else getattr(el, "type", None)

        if category == "Table" or element_type == "Table":
            table_count += 1
            table_text = el.get("text") if isinstance(el, dict) else getattr(el, "text", "")

            table_path = os.path.join(output_folder, f"{doc_name}_table{table_count}.txt")
            try:
                with open(table_path, 'w', encoding='utf-8') as f:
                    f.write(table_text)
            except Exception:
                continue

            table_results.append({
                "path": table_path,
                "page_number": None,
                "caption": f"Web Table {table_count}",
                "data": table_text,
                "extraction_method": "unstructured"
            })

    return table_results

def filter_footer_content(elements):
    filtered = []
    for element in elements:
        element_type = element.get("type", "")
        category = element.get("category", "")

        if element_type == "Footer" or category == "Footer":
            continue

        filtered.append(element)

    logger.info(f"Filtered out {len(elements) - len(filtered)} footer elements")
    return filtered

def merge_split_titles(elements):
    merged = []
    i = 0
    while i < len(elements):
        current = elements[i]
        if (current.get("type") == "Title" and current.get("text") and len(current["text"].strip()) < 100):
            j = i + 1
            title_text = current["text"].strip()
            while j < len(elements):
                next_el = elements[j]
                next_text = next_el.get("text", "").strip()
                if (len(next_text) < 50 and not next_text.endswith('.') and next_el.get("type") in ["Title", "Text"]):
                    title_text += " " + next_text
                    j += 1
                else:
                    break
            merged_element = current.copy()
            merged_element["text"] = title_text
            merged.append(merged_element)
            i = j
        else:
            merged.append(current)
            i += 1
    return merged

def extract_toc(elements):
    toc_sections = []
    in_toc = False
    for element in elements:
        text = element.get("text", "").strip().lower()
        if any(phrase in text for phrase in ["table of contents", "contents", "index"]):
            in_toc = True
            continue
        if in_toc and (len(text) > 200 or any(phrase in text for phrase in ["introduction", "chapter 1", "section 1"])):
            in_toc = False
        if in_toc and text:
            toc_sections.append(element)
    return toc_sections

def clean_toc_sections(toc_sections):
    cleaned = []
    for section in toc_sections:
        text = section.get("text", "").strip()
        if text and len(text) > 5:
            cleaned.append({"title": text, "level": 1})
    return cleaned

def parse_toc_content(elements, toc_sections):
    chunks = []
    if not toc_sections:
        return chunks

    current_chunk = ""
    current_label = "Introduction"

    for element in elements:
        text = element.get("text", "").strip()
        element_type = element.get("type", "")

        if element_type == "Title" and len(text) > 10:
            if current_chunk.strip():
                chunks.append({
                    "file_source": "",
                    "label": current_label,
                    "content": clean_content(current_chunk)
                })
            current_label = text
            current_chunk = ""
        elif text:
            current_chunk += text + "\n"

    if current_chunk.strip():
        chunks.append({
            "file_source": "",
            "label": current_label,
            "content": clean_content(current_chunk)
        })

    return chunks

def extract_web_sections(url: str, figures_dir: str) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    cached_data = check_extracted_cache(url)
    if cached_data and all(k in cached_data for k in ['chunks', 'images', 'tables']):
        return cached_data['chunks'], cached_data['images'], cached_data['tables']

    extracts_dir = "extracts"
    os.makedirs(extracts_dir, exist_ok=True)

    last_exc = None
    for agent in USER_AGENTS:
        try:
            resp = requests.get(url, headers={"User-Agent": agent}, timeout=10)
            resp.raise_for_status()

            url_safe = url.replace("://", "_").replace("/", "_")[:50]
            sections_json_name = os.path.join(extracts_dir, f"web_sections_{url_safe}.json")

            if os.path.exists(sections_json_name):
                with open(sections_json_name, "r") as f:
                    sections_dicts = json.load(f)
                elements = None
            else:
                elements = partition_html(text=resp.text, extract_images_in_html=True)
                sections_dicts = [el.to_dict() if hasattr(el, "to_dict") else el for el in elements]
                with open(sections_json_name, "w") as f:
                    json.dump(sections_dicts, f)

            sections_dicts = filter_footer_content(sections_dicts)
            images = download_web_images(url, elements or [], os.path.join(figures_dir, "images"))
            tables = save_table_screenshots_from_web(sections_dicts, os.path.join(figures_dir, "tables"))
            merged_sections = merge_split_titles(sections_dicts)
            toc_sections_raw = extract_toc(merged_sections)

            if toc_sections_raw:
                toc_sections = clean_toc_sections(toc_sections_raw)
                chunks = parse_toc_content(merged_sections, toc_sections)
            else:
                chunks = []
                current_chunk = {
                    "file_source": url,
                    "label": "untitled_section",
                    "content": []
                }

                for el in merged_sections:
                    text = el.get("text", "").strip()
                    el_type = el.get("type", "").lower()

                    if not text:
                        continue

                    if el_type in ["title", "heading", "header"]:
                        if current_chunk["content"]:
                            chunks.append(current_chunk)
                        current_chunk = {
                            "file_source": url,
                            "label": text,
                            "content": []
                        }
                    elif el_type in ["text", "list", "paragraph"]:
                        current_chunk["content"].append(text)

                if current_chunk["content"]:
                    chunks.append(current_chunk)

            for chunk in chunks:
                chunk["file_source"] = url

            cache_data = {'chunks': chunks, 'images': images, 'tables': tables}
            save_extracted_cache(url, cache_data)

            return chunks, images, tables

        except Exception as exc:
            last_exc = exc
            continue

    raise last_exc
