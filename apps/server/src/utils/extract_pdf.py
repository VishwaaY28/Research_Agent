import fitz
import os
import json
from PIL import Image
import pytesseract
from typing import List, Dict, Tuple
from unstructured.partition.pdf import partition_pdf
from pathlib import Path
import logging

from utils.cache import check_extracted_cache, save_extracted_cache
from utils.clean import clean_content

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# def extract_images_from_pdf(filepath: str, output_folder: str = "tmp/") -> List[Dict]:
#     """Extract images from PDF following pdf.py logic exactly"""
#     logger.info(f"Starting image extraction from {filepath}")
#     os.makedirs(output_folder, exist_ok=True)
#     doc_name = Path(filepath).stem
#     doc = fitz.open(filepath)
#     images = []

#     for page_num in range(len(doc)):
#         page = doc[page_num]
#         image_list = page.get_images(full=True)
#         logger.info(f"Found {len(image_list)} images on page {page_num + 1}")

#         for img_id, img in enumerate(image_list, start=1):
#             xref = img[0]
#             base_image = doc.extract_image(xref)
#             image_bytes = base_image["image"]
#             ext = base_image["ext"]
#             width = base_image["width"]
#             height = base_image["height"]

#             if width < 10 or height < 10:
#                 logger.debug(f"Skipping small image: {width}x{height}")
#                 continue
#             if len(image_bytes) < 1024:
#                 logger.debug(f"Skipping small image file: {len(image_bytes)} bytes")
#                 continue

#             img_path = os.path.join(
#                 output_folder,
#                 f"{doc_name}_page{page_num+1}_img{img_id}.{ext}"
#             )

#             try:
#                 with open(img_path, "wb") as img_file:
#                     img_file.write(image_bytes)

#                 ocr_text = ""
#                 try:
#                     with Image.open(img_path) as im:
#                         ocr_text = pytesseract.image_to_string(im).strip()
#                 except Exception as e:
#                     logger.warning(f"OCR failed for {img_path}: {e}")

#                 images.append({
#                     "path": img_path,
#                     "page_number": page_num + 1,
#                     "caption": f"Image {img_id} from page {page_num + 1}",
#                     "ocr_text": ocr_text
#                 })
#                 logger.info(f"Extracted image: {img_path}")
#             except Exception as e:
#                 logger.error(f"Failed to save image {img_path}: {e}")
#                 continue

#     doc.close()
#     logger.info(f"Extracted {len(images)} images total")
#     return images

# def save_table_screenshots_from_unstructured(table_elements, output_folder="tmp/tables", pdf_filepath=None):
#     """Save table screenshots with explicit PDF filepath parameter"""
#     logger.info("Starting table screenshot saving...")

#     tables = []
#     for el in table_elements:
#         category = el.get("category") if isinstance(el, dict) else getattr(el, "category", None)
#         element_type = el.get("type") if isinstance(el, dict) else getattr(el, "type", None)

#         if category == "Table" or element_type == "Table":
#             tables.append(el)

#     logger.info(f"Found {len(tables)} table elements for screenshots")

#     if not tables:
#         logger.info("No tables found, returning empty list")
#         return []

#     if not pdf_filepath:
#         logger.error("PDF filepath not provided for table screenshots")
#         return []

#     logger.info(f"Using PDF path for screenshots: {pdf_filepath}")

#     if not os.path.exists(pdf_filepath):
#         logger.error(f"PDF file not found at path: {pdf_filepath}")
#         return []

#     os.makedirs(output_folder, exist_ok=True)
#     doc_name = Path(pdf_filepath).stem
#     doc = fitz.open(pdf_filepath)
#     table_results = []
#     table_count = 0

#     for el in table_elements:
#         category = el.get("category") if isinstance(el, dict) else getattr(el, "category", None)
#         element_type = el.get("type") if isinstance(el, dict) else getattr(el, "type", None)
#         metadata = el.get("metadata") if isinstance(el, dict) else getattr(el, "metadata", None)
#         page_number = None

#         if metadata:
#             page_number = metadata.get("page_number") if isinstance(metadata, dict) else getattr(metadata, "page_number", None)

#         if (category == "Table" or element_type == "Table") and page_number is not None:
#             logger.info(f"Saving screenshot for table on page {page_number}")
#             page_idx = int(page_number) - 1
#             if 0 <= page_idx < len(doc):
#                 pix = doc[page_idx].get_pixmap(dpi=200)
#                 img_path = os.path.join(
#                     output_folder,
#                     f"{doc_name}_table{table_count+1}_page{page_number}.png"
#                 )
#                 pix.save(img_path)

#                 table_text = el.get("text") if isinstance(el, dict) else getattr(el, "text", "")

#                 html_content = None
#                 if metadata and hasattr(metadata, 'text_as_html'):
#                     html_content = metadata.text_as_html
#                 elif isinstance(metadata, dict) and 'text_as_html' in metadata:
#                     html_content = metadata['text_as_html']

#                 table_results.append({
#                     "path": img_path,
#                     "page_number": int(page_number),
#                     "caption": f"Table {table_count+1} from page {page_number}",
#                     "data": html_content or table_text,
#                     "extraction_method": "unstructured"
#                 })
#                 table_count += 1
#                 logger.info(f"Saved table screenshot: {img_path}")

#     doc.close()
#     logger.info(f"Saved {len(table_results)} table screenshots")
#     return table_results

# def get_table_page_numbers(table_elements):
#     """Get page numbers that contain tables - exact pdf.py logic"""
#     logger.info("Getting table page numbers...")
#     pages = set()

#     for el in table_elements:
#         category = el.get("category") if isinstance(el, dict) else getattr(el, "category", None)
#         element_type = el.get("type") if isinstance(el, dict) else getattr(el, "type", None)
#         metadata = el.get("metadata") if isinstance(el, dict) else getattr(el, "metadata", None)
#         page_number = None

#         if metadata:
#             page_number = metadata.get("page_number") if isinstance(metadata, dict) else getattr(metadata, "page_number", None)

#         if (category == "Table" or element_type == "Table") and page_number is not None:
#             pages.add(int(page_number))
#             logger.debug(f"Found table on page {page_number}")

#     logger.info(f"Tables found on pages: {sorted(pages)}")
#     return pages

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

def parse_toc_content(elements, toc_sections):
    """Parse content based on TOC structure"""
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

def filter_out_table_pages_from_extracted(chunks, table_pages):
    """Filter content that appears on pages with tables"""
    return chunks

def extract_pdf_sections(filepath: str, figures_dir: str) -> List[Dict]:
    """Extract sections from PDF - returns only chunks"""
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

    sections_dicts = filter_footer_content(sections_dicts)

    # tables_json_name = os.path.join(extracts_dir, f"tables_{Path(filepath).stem}.json")
    # if os.path.exists(tables_json_name):
    #     logger.info(f"Loading cached table elements from {tables_json_name}")
    #     with open(tables_json_name, "r") as f:
    #         table_elements = json.load(f)
    # else:
    #     logger.info("SECOND PASS: Extracting table elements with hi_res strategy (skip_infer_table_types=False)...")
    #     table_elements = partition_pdf(
    #         filename=filepath,
    #         skip_infer_table_types=False,
    #         strategy='hi_res',
    #     )
    #     table_elements = [el.to_dict() if hasattr(el, "to_dict") else el for el in table_elements]
    #     with open(tables_json_name, "w") as f:
    #         json.dump(table_elements, f)
    #     logger.info(f"Saved table elements to {tables_json_name}")

    # table_elements = filter_footer_content(table_elements)
    # table_pages = get_table_page_numbers(table_elements)

    # images = extract_images_from_pdf(filepath, os.path.join(figures_dir, "images"))
    # tables = save_table_screenshots_from_unstructured(
    #     table_elements,
    #     os.path.join(figures_dir, "tables"),
    #     pdf_filepath=filepath
    # )

    merged_sections = merge_split_titles(sections_dicts)

    title_sections = [section for section in merged_sections if section.get("type") == "Title"]
    toc_sections_raw = extract_toc(merged_sections)

    if toc_sections_raw:
        logger.info("Using TOC-based extraction")
        toc_sections = clean_toc_sections(toc_sections_raw)
        chunks = parse_toc_content(merged_sections, toc_sections)
        # chunks = filter_out_table_pages_from_extracted(chunks, table_pages)
    else:
        logger.info("Using fallback chunking")
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

    logger.info(f"Extraction complete: {len(chunks)} chunks")
    return chunks
