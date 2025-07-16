import os
import re
import json
import pytesseract
from PIL import Image
from typing import List, Dict, Tuple
from unstructured.partition.docx import partition_docx
from pathlib import Path
import zipfile
import logging

from utils.cache import check_extracted_cache, save_extracted_cache
from utils.clean import clean_content

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# def extract_images_from_docx(filepath: str, output_folder: str = "tmp") -> List[Dict]:
#     """Extract images from DOCX file following pdf.py logic exactly"""
#     os.makedirs(output_folder, exist_ok=True)
#     doc_name = Path(filepath).stem
#     images = []

#     try:
#         with zipfile.ZipFile(filepath, 'r') as docx_zip:
#             image_files = [f for f in docx_zip.namelist() if f.startswith('word/media/')]

#             for i, img_file in enumerate(image_files, start=1):
#                 try:
#                     img_data = docx_zip.read(img_file)
#                     ext = os.path.splitext(img_file)[1]

#                     if len(img_data) < 1024:
#                         continue

#                     img_path = os.path.join(output_folder, f"{doc_name}_img_{i}{ext}")

#                     with open(img_path, 'wb') as f:
#                         f.write(img_data)

#                     try:
#                         with Image.open(img_path) as im:
#                             if im.width < 10 or im.height < 10:
#                                 continue
#                             ocr_text = pytesseract.image_to_string(im).strip()
#                     except Exception:
#                         ocr_text = ""

#                     images.append({
#                         "path": img_path,
#                         "page_number": None,
#                         "caption": f"Image {i}",
#                         "ocr_text": ocr_text
#                     })
#                 except Exception:
#                     continue

#     except Exception as e:
#         print(f"Error extracting images from DOCX: {e}")

#     return images

# def save_table_screenshots_from_docx(elements, output_folder="tmp/tables"):
#     """Save table content from DOCX following pdf.py logic exactly"""
#     tables = [el for el in elements if
#               (getattr(el, "category", None) == "Table" or el.get("category") == "Table" or
#                getattr(el, "type", None) == "Table" or el.get("type") == "Table")]
#     if not tables:
#         return []

#     os.makedirs(output_folder, exist_ok=True)
#     doc_name = "docx_document"
#     table_results = []
#     table_count = 0

#     for el in elements:
#         category = el.get("category") if isinstance(el, dict) else getattr(el, "category", None)
#         element_type = el.get("type") if isinstance(el, dict) else getattr(el, "type", None)

#         if category == "Table" or element_type == "Table":
#             table_count += 1
#             table_text = el.get("text") if isinstance(el, dict) else getattr(el, "text", "")

#             table_path = os.path.join(output_folder, f"docx_table{table_count}.txt")
#             try:
#                 with open(table_path, 'w', encoding='utf-8') as f:
#                     f.write(table_text)
#             except Exception:
#                 continue

#             table_results.append({
#                 "path": table_path,
#                 "page_number": None,
#                 "caption": f"Table {table_count}",
#                 "data": table_text,
#                 "extraction_method": "unstructured"
#             })

#     return table_results

def filter_footer_content(elements):
    """Filter out footer content from elements"""
    filtered = []
    for element in elements:
        element_type = element.get("type", "")
        category = element.get("category", "")

        if element_type == "Footer" or category == "Footer":
            logger.debug(f"Skipping footer content: {element.get('text', '')[:50]}...")
            continue

        filtered.append(element)

    logger.info(f"Filtered out {len(elements) - len(filtered)} footer elements")
    return filtered

def merge_split_titles(elements):
    """Merge split titles that appear on consecutive elements"""
    merged = []
    i = 0
    while i < len(elements):
        current = elements[i]

        if (current.get("type") == "Title" and
            current.get("text") and
            len(current["text"].strip()) < 100):

            j = i + 1
            title_text = current["text"].strip()

            while j < len(elements):
                next_el = elements[j]
                next_text = next_el.get("text", "").strip()

                if (len(next_text) < 50 and
                    not next_text.endswith('.') and
                    next_el.get("type") in ["Title", "Text"]):
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
    """Extract table of contents sections"""
    toc_sections = []
    in_toc = False

    for element in elements:
        text = element.get("text", "").strip().lower()

        if any(phrase in text for phrase in ["table of contents", "contents", "index"]):
            in_toc = True
            continue

        if in_toc and (len(text) > 200 or
                      any(phrase in text for phrase in ["introduction", "chapter 1", "section 1"])):
            in_toc = False

        if in_toc and text:
            toc_sections.append(element)

    return toc_sections

def clean_toc_sections(toc_sections):
    """Clean and format TOC sections"""
    cleaned = []
    for section in toc_sections:
        text = section.get("text", "").strip()
        if text and len(text) > 5:
            cleaned.append({
                "title": text,
                "level": 1
            })
    return cleaned

def parse_toc_with_pages(toc_sections):
    """Parse TOC entries and extract their titles and page numbers using regex."""
    toc_entries = []
    page_num_pattern = re.compile(r"(.*?)\s+(\d+)$")
    for section in toc_sections:
        text = section.get("text", "").strip()
        match = page_num_pattern.match(text)
        if match:
            title = match.group(1).strip()
            page = int(match.group(2))
            toc_entries.append({"title": title, "page": page})
        else:
            # If no page number, just use the text
            toc_entries.append({"title": text, "page": None})
    return toc_entries

def parse_toc_hierarchical(elements, toc_sections):
    """Parse content into hierarchical TOC structure using TOC page numbers for grouping.
    Only TOC headings are major chunks. All other Titles/paragraphs are minor chunks under the correct TOC heading.
    """
    chunks = []
    if not toc_sections:
        return chunks

    toc_entries = parse_toc_with_pages(toc_sections)
    toc_headings = set(e["title"].strip() for e in toc_entries if e["title"])
    toc_entries_with_pages = [e for e in toc_entries if e["page"] is not None]
    if not toc_entries_with_pages:
        return parse_toc_hierarchical_old(elements, toc_sections)

    toc_entries_with_pages.sort(key=lambda x: x["page"])
    for idx, entry in enumerate(toc_entries_with_pages):
        if idx < len(toc_entries_with_pages) - 1:
            entry["end_page"] = toc_entries_with_pages[idx + 1]["page"] - 1
        else:
            entry["end_page"] = None

    for entry in toc_entries_with_pages:
        section_elements = []
        for el in elements:
            page_number = el.get("metadata", {}).get("page_number")
            if page_number is not None:
                if page_number >= entry["page"] and (entry["end_page"] is None or page_number <= entry["end_page"]):
                    section_elements.append(el)
        # Group by subheadings (titles) as minor chunks, but skip TOC headings
        minor_chunks = []
        current_minor = None
        for el in section_elements:
            text = el.get("text", "").strip()
            el_type = el.get("type", "")
            page_number = el.get("metadata", {}).get("page_number")
            # Skip TOC headings as minor chunks
            if el_type == "Title" and text and text in toc_headings:
                continue
            if el_type == "Title" and text:
                if current_minor:
                    minor_chunks.append(current_minor)
                current_minor = {
                    "tag": text,
                    "content": []
                }
            elif text:
                if not current_minor:
                    current_minor = {"tag": "Untitled Section", "content": []}
                current_minor["content"].append({
                    "text": text,
                    "page_number": page_number
                })
        if current_minor:
            minor_chunks.append(current_minor)
        start_range = f"Page {entry['page']}"
        end_range = f"Page {entry['end_page']}" if entry['end_page'] else "End"
        chunks.append({
            "title": entry["title"],
            "start_range": start_range,
            "end_range": end_range,
            "content": minor_chunks
        })
    return chunks

def parse_toc_hierarchical_old(elements, toc_sections):
    # Old logic for fallback if no page numbers in TOC
    chunks = []
    toc_titles = [toc['title'] for toc in toc_sections]
    toc_indices = []
    for i, el in enumerate(elements):
        text = el.get("text", "").strip()
        if text in toc_titles:
            toc_indices.append((text, i))
    toc_indices.append((None, len(elements)))
    for idx in range(len(toc_indices) - 1):
        section_title, start_idx = toc_indices[idx]
        _, end_idx = toc_indices[idx + 1]
        section_elements = elements[start_idx:end_idx]
        minor_chunks = []
        current_minor = None
        for el in section_elements:
            text = el.get("text", "").strip()
            el_type = el.get("type", "")
            page_number = el.get("metadata", {}).get("page_number")
            if el_type == "Title" and text and text != section_title:
                if current_minor:
                    minor_chunks.append(current_minor)
                current_minor = {
                    "tag": text,
                    "content": []
                }
            elif text:
                if not current_minor:
                    current_minor = {"tag": section_title, "content": []}
                current_minor["content"].append({
                    "text": text,
                    "page_number": page_number
                })
        if current_minor:
            minor_chunks.append(current_minor)
        page_numbers = [c["page_number"] for m in minor_chunks for c in m["content"] if c["page_number"]]
        if page_numbers:
            start_range = f"Page {min(page_numbers)}"
            end_range = f"Page {max(page_numbers)}"
        else:
            start_range = end_range = "-"
        chunks.append({
            "title": section_title,
            "start_range": start_range,
            "end_range": end_range,
            "content": minor_chunks
        })
    return chunks

def extract_docx_sections(filepath: str, figures_dir: str) -> List[Dict]:
    """Extract sections from DOCX - returns only chunks"""
    cached_data = check_extracted_cache(filepath)
    if cached_data and 'chunks' in cached_data:
        return cached_data['chunks']

    extracts_dir = "extracts"
    os.makedirs(extracts_dir, exist_ok=True)

    sections_json_name = os.path.join(extracts_dir, f"docx_sections_{Path(filepath).stem}.json")
    if os.path.exists(sections_json_name):
        with open(sections_json_name, "r") as f:
            sections_dicts = json.load(f)
    else:
        elements = partition_docx(filename=filepath)
        sections_dicts = [el.to_dict() if hasattr(el, "to_dict") else el for el in elements]
        with open(sections_json_name, "w") as f:
            json.dump(sections_dicts, f)

    sections_dicts = filter_footer_content(sections_dicts)

    # images = extract_images_from_docx(filepath, os.path.join(figures_dir, "images"))
    # tables = save_table_screenshots_from_docx(sections_dicts, os.path.join(figures_dir, "tables"))

    merged_sections = merge_split_titles(sections_dicts)

    title_sections = [section for section in merged_sections if section.get("type") == "Title"]
    toc_sections_raw = extract_toc(merged_sections)

    if toc_sections_raw:
        toc_sections = clean_toc_sections(toc_sections_raw)
        chunks = parse_toc_hierarchical(merged_sections, toc_sections)
    else:
        chunks = []
        buffer = ""
        section_num = 1

        for el in sections_dicts:
            if el.get("text"):
                buffer += el["text"] + "\n"
                if len(buffer) > 2000:
                    chunks.append({
                        "file_source": filepath,
                        "label": f"Section {section_num}",
                        "content": clean_content(buffer)
                    })
                    section_num += 1
                    buffer = ""

        if buffer.strip():
            chunks.append({
                "file_source": filepath,
                "label": f"Section {section_num}",
                "content": clean_content(buffer)
            })

    for chunk in chunks:
        chunk["file_source"] = filepath

    cache_data = {'chunks': chunks}
    save_extracted_cache(filepath, cache_data)

    return chunks
