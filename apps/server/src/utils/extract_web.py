import os
import json
import requests
import pytesseract
from unstructured.partition.html import partition_html
from PIL import Image
from typing import List, Dict
import hashlib

from utils.clean import clean_content

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:113.0) Gecko/20100101 Firefox/113.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
]

def get_cache_filename(url: str) -> str:
    """Generate a safe filename for caching based on URL"""
    url_hash = hashlib.md5(url.encode()).hexdigest()
    safe_url = url.replace("://", "_").replace("/", "_").replace("?", "_").replace("&", "_")[:50]
    return f"{safe_url}_{url_hash}.json"

def check_extracted_cache(url: str, extracts_dir: str = "extracts") -> Dict:
    """Check if content has been previously extracted and cached"""
    if not os.path.exists(extracts_dir):
        return None

    cache_file = os.path.join(extracts_dir, get_cache_filename(url))
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    return None

def save_extracted_cache(url: str, data: Dict, extracts_dir: str = "extracts"):
    """Save extracted content to cache"""
    os.makedirs(extracts_dir, exist_ok=True)
    cache_file = os.path.join(extracts_dir, get_cache_filename(url))
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except IOError:
        pass

def extract_web_text(url: str) -> str:
    cached_data = check_extracted_cache(url)
    if cached_data and 'text' in cached_data:
        return cached_data['text']

    last_exc = None
    for agent in USER_AGENTS:
        try:
            resp = requests.get(url, headers={"User-Agent": agent}, timeout=10)
            resp.raise_for_status()
            elements = partition_html(text=resp.text)
            text = "\n".join([el.text for el in elements if el.text])

            save_extracted_cache(url, {'text': text})
            return text
        except Exception as exc:
            last_exc = exc
            continue
    raise last_exc

def extract_web_sections(url: str, figures_dir: str) -> (List[Dict], List[str]):
    cached_data = check_extracted_cache(url)
    if cached_data and 'chunks' in cached_data and 'figures' in cached_data:
        return cached_data['chunks'], cached_data['figures']

    last_exc = None
    for agent in USER_AGENTS:
        try:
            resp = requests.get(url, headers={"User-Agent": agent}, timeout=10)
            resp.raise_for_status()
            elements = partition_html(text=resp.text, extract_images_in_html=True)

            chunks = []
            figures = []
            buffer = ""
            section_num = 1

            for el in elements:
                if hasattr(el, "metadata") and getattr(el, "metadata", None):
                    img_path = getattr(el.metadata, "image_path", None)
                    if img_path and os.path.exists(img_path):
                        try:
                            if os.path.getsize(img_path) < 2048:
                                continue
                            base = url.replace("://", "_").replace("/", "_")
                            ext = os.path.splitext(img_path)[1]
                            dest_path = os.path.join(figures_dir, f"{base}_figure_{len(figures)+1}{ext}")
                            with open(img_path, "rb") as src, open(dest_path, "wb") as dst:
                                dst.write(src.read())
                            figures.append(dest_path)

                            with Image.open(dest_path) as im:
                                ocr_text = pytesseract.image_to_string(im)
                                if ocr_text.strip():
                                    buffer += f"\n[Image OCR]: {ocr_text.strip()}\n"
                        except Exception:
                            continue

                if hasattr(el, "text") and el.text:
                    buffer += el.text + "\n"
                    if len(buffer) > 1000:
                        chunks.append({
                            "file_source": url,
                            "label": f"Section {section_num}",
                            "content": clean_content(buffer)
                        })
                        section_num += 1
                        buffer = ""

            if buffer.strip():
                chunks.append({
                    "file_source": url,
                    "label": f"Section {section_num}",
                    "content": clean_content(buffer)
                })

            save_extracted_cache(url, {'chunks': chunks, 'figures': figures})
            return chunks, figures
        except Exception as exc:
            last_exc = exc
            continue
    raise last_exc
