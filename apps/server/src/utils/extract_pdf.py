import os
import json
import re
from pathlib import Path
import logging
from typing import List, Dict
from unstructured.partition.pdf import partition_pdf
from utils.cache import check_extracted_cache, save_extracted_cache
from utils.clean import clean_content

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

def clean_toc_title(text):
    return re.sub(r"\s*\.{2,}\s*\d+$","",text).strip()

def extract_toc_entries_from_elements(elements):
    """Extract TOC entries (title, page) from elements, robustly."""
    toc_start = None
    texts = [e.get("text", "") for e in elements if e.get("text") and e.get("text").strip()]
    for i, block in enumerate(texts):
        if re.search(r"(table of contents|contents)", block, re.IGNORECASE):
            toc_start = i
            break
    if toc_start is None:
        return []
    toc_lines = []
    for line in texts[toc_start:]:
        line = line.strip()
        if not line:
            continue
        if re.search(r"\.{2,}\s*\d+\s*$", line) or re.search(r"\s{2,}\d+\s*$", line):
            toc_lines.append(line)
    entries = []
    for line in toc_lines:
        line = re.sub(r"\s{2,}", " ", line).strip()
        match = re.match(r"^(.*?)(?:\.{2,}|\s{2,}|\s+)\s*(\d+)$", line)
        if match:
            title = match.group(1).strip(":- ").strip()
            page = int(match.group(2))
            entries.append({"title": title, "page": page})
    return entries

def group_elements_by_page(elements):
    """Group text elements by page, skipping footers."""
    page_map = {}
    footer_patterns = [
        r"©\s*hexaware technologies limited.*",
        r"www\.hexaware\.com",
        r"\[proprietary and confidential\]",
        r"^page\s*\d+$",
        r"^\d{1,3}$"
    ]
    for e in elements:
        metadata = e.get("metadata", {})
        page_num = metadata.get("page_number")
        text = e.get("text", "").strip()
        if not text or page_num is None:
            continue
        text_lower = text.lower().strip()
        is_footer = any(re.match(pat, text_lower) for pat in footer_patterns)
        if is_footer:
            continue
        page_map.setdefault(page_num, []).append(text)
    return page_map

def chunk_by_toc_with_minors(entries, elements):
    """
    For each TOC entry (major chunk), collect all elements in its page range,
    then subdivide into minor chunks using 'Title' elements as boundaries.
    """
    if not entries or not elements:
        return []
    # Build a map of page_number -> [elements]
    page_map = {}
    for el in elements:
        metadata = el.get("metadata", {})
        page_num = metadata.get("page_number")
        if page_num is not None:
            page_map.setdefault(page_num, []).append(el)
    sorted_pages = sorted(page_map.keys())
    last_page = max(sorted_pages) if sorted_pages else 0
    chunks = []
    for i, entry in enumerate(entries):
        title = entry["title"]
        start_page = entry["page"]
        end_page = entries[i + 1]["page"] if i + 1 < len(entries) else last_page + 1
        # Gather all elements in this TOC section's page range
        section_elements = []
        for page in range(start_page, end_page):
            section_elements.extend(page_map.get(page, []))
        # Minor chunking: group by 'Title' elements
        minor_chunks = []
        current_minor = None
        for el in section_elements:
            text = el.get("text", "").strip()
            el_type = el.get("type", "")
            page_number = el.get("metadata", {}).get("page_number")
            # Start a new minor chunk at each Title (not the TOC section title itself)
            if el_type == "Title" and text and text != title:
                if current_minor:
                    minor_chunks.append(current_minor)
                current_minor = {
                    "tag": text,
                    "content": []
                }
            elif text:
                if not current_minor:
                    current_minor = {
                        "tag": "Untitled Section",
                        "content": []
                    }
                current_minor["content"].append({
                    "text": text,
                    "page_number": page_number
                })
        if current_minor:
            minor_chunks.append(current_minor)
        chunks.append({
            "title": title,
            "start_page": start_page,
            "end_page": end_page - 1,
            "content": minor_chunks
        })
    return chunks

def extract_pdf_sections(filepath: str, figures_dir: str) -> List[Dict]:
    """Extract sections from PDF - returns TOC-based chunks with minor chunking if possible, else fallback."""
    logger.info(f"Starting PDF extraction for: {filepath}")

    cached_data = check_extracted_cache(filepath)
    if cached_data and 'chunks' in cached_data:
        logger.info("Using cached data")
        return cached_data['chunks']

    extracts_dir = "extracts"
    os.makedirs(extracts_dir, exist_ok=True)

    output_json_name = os.path.join(extracts_dir, f"sections_{Path(filepath).stem}.json")
    if os.path.exists(output_json_name):
        logger.info(f"Loading cached sections from {output_json_name}")
        with open(output_json_name, "r") as f:
            sections_dicts = json.load(f)
    else:
        logger.info("Extracting sections with default settings...")
        elements = partition_pdf(filename=filepath, extract_images_in_pdf=False)
        sections_dicts = [el.to_dict() if hasattr(el, "to_dict") else el for el in elements]
        with open(output_json_name, "w") as f:
            json.dump(sections_dicts, f)
        logger.info(f"Saved sections to {output_json_name}")

    # Filter out footers using both type/category and patterns
    sections_dicts = filter_footer_content(sections_dicts)

    toc_entries = extract_toc_entries_from_elements(sections_dicts)
    if toc_entries:
        logger.info("Using robust TOC-based chunking with minor chunks")
        chunks = chunk_by_toc_with_minors(toc_entries, sections_dicts)
        for chunk in chunks:
            chunk["file_source"] = filepath
    else:
        logger.info("Using fallback chunking (flat)")
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
    cache_data = {'chunks': chunks}
    save_extracted_cache(filepath, cache_data)
    logger.info(f"Extraction complete: {len(chunks)} chunks")
    return chunks
