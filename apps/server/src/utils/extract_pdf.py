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
import re

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

def clean_toc_title(text):
  return re.sub(r"\s*\.{2,}\s*\d+$","",text).strip()

def clean_toc_sections(toc_sections):
    """Clean and format TOC sections"""
    cleaned = []
    for section in toc_sections:
        text = section.get("text", "").strip()
        text = clean_toc_title(text)
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

def parse_toc_with_pages(toc_sections):
    """Parse TOC entries and extract their titles and page numbers using regex."""
    toc_entries = []
    page_num_pattern = re.compile(r"(.*?)\s+\.{2,}\s*(\d+)$")
    for section in toc_sections:
        text = section.get("text", "").strip()
        match = page_num_pattern.match(section.get("text", "").strip())
        if match:
            title = match.group(1).strip()
            page = int(match.group(2))
            title = clean_toc_title(title)
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
    entry["end_page"] = (
      toc_entries_with_pages[idx + 1]["page"] - 1
      if idx + 1 < len(toc_entries_with_pages)
      else None
    )

  for entry in toc_entries_with_pages:
    section_elements = []
    for el in elements:
      page_number = el.get("metadata", {}).get("page_number")
      if page_number is not None and page_number >= entry["page"]:
        if entry["end_page"] is None or page_number <= entry["end_page"]:
          section_elements.append(el)

    # Now create minor chunks by grouping under each 'Title' in the section
    minor_chunks = []
    current_minor = None

    for el in section_elements:
      text = el.get("text", "").strip()
      el_type = el.get("type", "")
      page_number = el.get("metadata", {}).get("page_number")

      if el_type == "Title" and text and text not in toc_headings:
        if current_minor:
          minor_chunks.append(current_minor)
        current_minor = {
          "tag": clean_toc_title(text),
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

    start_range = f"Page {entry['page']}"
    end_range = f"Page {entry['end_page']}" if entry['end_page'] else "End"

    chunks.append({
      "title": clean_toc_title(entry["title"]),
      "start_range": start_range,
      "end_range": end_range,
      "content": minor_chunks
    })

  return chunks


def parse_toc_hierarchical_old(elements, toc_sections):
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

def chunk_by_toc(entries, page_map):
    """Chunk text by TOC page ranges."""
    if not entries or not page_map:
        return []
    sorted_pages = sorted(page_map.keys())
    last_page = max(sorted_pages)
    chunks = []
    for i, entry in enumerate(entries):
        title = entry["title"]
        start_page = entry["page"]
        end_page = entries[i + 1]["page"] if i + 1 < len(entries) else last_page + 1
        chunk_texts = []
        for page in range(start_page, end_page):
            if page in page_map:
                chunk_texts.extend(page_map[page])
        if chunk_texts:
            chunks.append({
                "file_source": "",
                "label": title,
                "content": clean_content("\n".join(chunk_texts))
            })
        else:
            chunks.append({
                "file_source": "",
                "label": title,
                "content": f"[No content found between page {start_page} and {end_page - 1}]"
            })
    return chunks

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
