import fitz
import re
import os
from PIL import Image
import pytesseract
from typing import List, Dict
from unstructured.partition.pdf import partition_pdf

from utils.clean import clean_content

def extract_pdf_text(filepath: str) -> str:
    elements = partition_pdf(filename=filepath, extract_images_in_pdf=True, ocr_languages="eng")
    return "\n".join([el.text for el in elements if el.text])

def extract_pdf_sections(filepath: str, figures_dir: str) -> (List[Dict], List[str]):
    doc = fitz.open(filepath)
    toc_text = doc[1].get_text()
    toc_lines = toc_text.splitlines()

    toc_entries = []
    buffer = ""
    for line in toc_lines:
        line = line.strip()
        m = re.match(r"(.+?)\s+(\d+)$", line)
        if m:
            heading, page = m.groups()
            heading = (buffer + " " + heading).strip() if buffer else heading.strip()
            heading = re.sub(r'\.*\s*$', '', heading)
            toc_entries.append((heading, int(page)))
            buffer = ""
        else:
            if line:
                buffer += (" " if buffer else "") + line

    sections = []
    found_toc = False
    for idx, (heading, page) in enumerate(toc_entries):
        if not found_toc and "table of contents" in heading.lower():
            found_toc = True
            m = re.search(r"table of contents\s*(.+)", heading, re.IGNORECASE)
            if m:
                first_label = m.group(1).strip()
                first_label = re.sub(r'\.*\s*$', '', first_label)
                first_page = page
                if idx + 1 < len(toc_entries):
                    end_page = toc_entries[idx + 1][1] - 2
                else:
                    end_page = len(doc) - 1
                sections.append({
                    "label": first_label,
                    "start_page": first_page - 1,
                    "end_page": end_page
                })
            continue
        elif found_toc:
            label = re.sub(r'\.*\s*$', '', heading)
            start_page = page - 1
            end_page = toc_entries[idx + 1][1] - 2 if idx + 1 < len(toc_entries) else len(doc) - 1
            sections.append({
                "label": label,
                "start_page": start_page,
                "end_page": end_page
            })

    if not sections:
        for idx, (heading, start_page) in enumerate(toc_entries):
            if "table of contents" not in heading.lower():
                label = re.sub(r'\.*\s*$', '', heading)
                start_page_idx = start_page - 1
                end_page_idx = toc_entries[idx + 1][1] - 2 if idx + 1 < len(toc_entries) else len(doc) - 1
                sections.append({
                    "label": label,
                    "start_page": start_page_idx,
                    "end_page": end_page_idx
                })

    figures = []
    page_images = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_images[page_num] = []
        for img_index, img in enumerate(page.get_images(full=True)):
            xref = img[0]
            base = os.path.splitext(os.path.basename(filepath))[0]
            img_path = os.path.join(figures_dir, f"{base}_page{page_num+1}_img{img_index+1}.png")
            try:
                pix = fitz.Pixmap(doc, xref)
                if pix.width == 1 or pix.height == 1:
                    pix = None
                    continue
                if pix.n < 5:
                    pix.save(img_path)
                else:
                    pix1 = fitz.Pixmap(fitz.csRGB, pix)
                    pix1.save(img_path)
                    pix1 = None
                pix = None

                if os.path.exists(img_path) and os.path.getsize(img_path) >= 2048:
                    figures.append(img_path)
                    try:
                        with Image.open(img_path) as im:
                            ocr_text = pytesseract.image_to_string(im)
                            if ocr_text.strip():
                                page_images[page_num].append(ocr_text.strip())
                    except Exception:
                        pass
                elif os.path.exists(img_path):
                    os.remove(img_path)
            except Exception:
                continue

    chunks = []
    for section in sections:
        content = ""
        for i in range(section["start_page"], section["end_page"] + 1):
            if 0 <= i < len(doc):
                page_text = doc[i].get_text()
                content += page_text

                if i in page_images and page_images[i]:
                    for ocr_text in page_images[i]:
                        content += f" [Image OCR]: {ocr_text}"

        chunks.append({
            "file_source": filepath,
            "label": section["label"],
            "content": clean_content(content)
        })

    return chunks, figures
