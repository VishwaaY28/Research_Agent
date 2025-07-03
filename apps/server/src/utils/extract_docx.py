import os
import re
import pytesseract
from PIL import Image
from typing import List, Dict
from unstructured.partition.docx import partition_docx

from utils.clean import clean_content

def extract_docx_text(filepath: str) -> str:
    elements = partition_docx(filename=filepath)
    return "\n".join([el.text for el in elements if el.text])

def extract_docx_sections(filepath: str, figures_dir: str) -> (List[Dict], List[str]):
    elements = partition_docx(filename=filepath, extract_images_in_docx=True)
    chunks = []
    figures = []
    buffer = ""
    label = None
    section_num = 1
    toc_found = False
    first_label = None

    for el in elements:
        if hasattr(el, "category") and el.category and "title" in el.category.lower():
            new_label = el.text.strip() if el.text else f"Section {section_num}"
            new_label = re.sub(r'\.*\s*$', '', new_label)

            if not toc_found and "table of contents" in new_label.lower():
                toc_found = True
                m = re.search(r"table of contents\s*(.+)", new_label, re.IGNORECASE)
                if m:
                    first_label = m.group(1).strip()
                    first_label = re.sub(r'\.*\s*$', '', first_label)
                    label = first_label
                    first_label_set = True
                buffer = ""
                continue

            if toc_found:
                if label is not None and buffer:
                    chunks.append({
                        "file_source": filepath,
                        "label": label,
                        "content": clean_content(buffer)
                    })
                    section_num += 1
                    buffer = ""
                label = new_label
                first_label_set = False

        if toc_found and hasattr(el, "metadata") and getattr(el, "metadata", None):
            img_path = getattr(el.metadata, "image_path", None)
            if img_path and os.path.exists(img_path):
                try:
                    if os.path.getsize(img_path) < 2048:
                        continue
                    base = os.path.splitext(os.path.basename(filepath))[0]
                    dest_path = os.path.join(figures_dir, f"{base}_figure_{section_num}_{os.path.basename(img_path)}")
                    with open(img_path, "rb") as src, open(dest_path, "wb") as dst:
                        dst.write(src.read())
                    figures.append(dest_path)
                    with Image.open(dest_path) as im:
                        ocr_text = pytesseract.image_to_string(im)
                        if ocr_text.strip():
                            buffer += f" [Image OCR]: {ocr_text.strip()}"
                except Exception:
                    continue

        if toc_found and hasattr(el, "text") and el.text:
            buffer += el.text + "\n"

    if label is not None and buffer:
        chunks.append({
            "file_source": filepath,
            "label": label,
            "content": clean_content(buffer)
        })

    return chunks, figures
