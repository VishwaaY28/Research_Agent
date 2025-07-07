import os
import fitz
import json
from pathlib import Path
from unstructured.partition.pdf import partition_pdf

def extract_pdf_chunks(filepath: str):
    elements = partition_pdf(filename=filepath)
    return elements

def save_table_screenshots_from_unstructured(elements, output_folder="tables"):
    """Extract table regions as images from PDF based on coordinates"""
    tables = [el for el in elements if
              (getattr(el, "category", None) == "Table" or el.get("category") == "Table" or
               getattr(el, "type", None) == "Table" or el.get("type") == "Table")]

    if not tables:
        print("No tables found in elements")
        return

    first_table = tables[0]
    metadata = first_table.get("metadata") if isinstance(first_table, dict) else getattr(first_table, "metadata", None)
    pdf_path = metadata.get("filename") if metadata and isinstance(metadata, dict) else None

    if not pdf_path:
        print("PDF path not found in metadata, cannot save table screenshots.")
        return

    os.makedirs(output_folder, exist_ok=True)
    doc_name = Path(pdf_path).stem
    doc = fitz.open(pdf_path)
    table_count = 0

    for el in elements:
        category = (el.get("category") if isinstance(el, dict) else getattr(el, "category", None)) or \
                  (el.get("type") if isinstance(el, dict) else getattr(el, "type", None))
        metadata = el.get("metadata") if isinstance(el, dict) else getattr(el, "metadata", None)

        if category == "Table" and metadata:
            page_number = metadata.get("page_number") if isinstance(metadata, dict) else getattr(metadata, "page_number", None)
            coordinates = metadata.get("coordinates") if isinstance(metadata, dict) else getattr(metadata, "coordinates", None)

            if page_number is not None:
                page_idx = int(page_number) - 1
                if 0 <= page_idx < len(doc):
                    page = doc[page_idx]

                    if coordinates:
                        try:
                            points = coordinates.get("points") if isinstance(coordinates, dict) else getattr(coordinates, "points", None)
                            if points and len(points) >= 4:
                                x_coords = [p[0] for p in points]
                                y_coords = [p[1] for p in points]
                                x0, y0 = min(x_coords), min(y_coords)
                                x1, y1 = max(x_coords), max(y_coords)

                                rect = fitz.Rect(x0, y0, x1, y1)
                                pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), clip=rect)
                            else:
                                pix = page.get_pixmap(dpi=200)
                        except Exception as e:
                            print(f"Error extracting coordinates for table on page {page_number}: {e}")
                            pix = page.get_pixmap(dpi=200)
                    else:
                        pix = page.get_pixmap(dpi=200)

                    img_path = os.path.join(
                        output_folder,
                        f"{doc_name}_table{table_count+1}_page{page_number}.png"
                    )
                    pix.save(img_path)
                    table_count += 1
                    print(f"Saved table {table_count} from page {page_number}")

    doc.close()
    print(f"Extracted {table_count} table images to {output_folder}")

def extract_images_from_pdf(filepath: str, output_folder: str = "figures"):
    os.makedirs(output_folder, exist_ok=True)
    doc_name = Path(filepath).stem
    doc = fitz.open(filepath)
    for page_num in range(len(doc)):
        page = doc[page_num]
        images = page.get_images(full=True)
        for img_id, img in enumerate(images, start=1):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            ext = base_image["ext"]
            width = base_image["width"]
            height = base_image["height"]
            if width < 10 or height < 10:
                continue
            if len(image_bytes) < 1024:
                continue
            img_path = os.path.join(
                output_folder,
                f"{doc_name}_page{page_num+1}_img{img_id}.{ext}"
            )
            with open(img_path, "wb") as img_file:
                img_file.write(image_bytes)
    doc.close()

def merge_split_titles(sections):
    merged = []
    i = 0
    while i < len(sections):
        curr = sections[i]
        if (
            i + 1 < len(sections)
            and curr["type"] in {"NarrativeText", "Title"}
            and sections[i + 1]["type"] in {"NarrativeText", "Title"}
            and curr["metadata"].get("page_number") == sections[i + 1]["metadata"].get("page_number")
        ):
            curr_text = curr.get("text", "")
            next_text = sections[i + 1].get("text", "")
            if (
                curr_text
                and next_text
                and not curr_text.strip().endswith((".", ":", ";", "!", "?"))
                and next_text[0].islower()
            ):
                merged_text = curr_text.rstrip() + " " + next_text.lstrip()
                merged.append({
                    **curr,
                    "type": "Title",
                    "text": merged_text,
                })
                i += 2
                continue
        merged.append(curr)
        i += 1
    return merged

def extract_toc(sections):
    toc_started = False
    toc_sections = []
    for section in sections:
        if not toc_started:
            if section.get("type") == "Title" and section.get("text", "").strip() == "Table of Contents":
                toc_started = True
                toc_sections.append(section)
        else:
            if section.get("type") == "Footer":
                break
            toc_sections.append(section)
    return toc_sections

def clean_toc_sections(title_sections):
    toc_sections = []
    parsed_sections = []
    for section in title_sections:
        if section.get("text") == "Table of Contents":
          continue
        text = section.get("text", "")
        if len(text) < 3:
            continue
        if "..." in text:
            tag = text.split("...")[0].strip()
            start_range = text.split()[-1]
        else:
            tag = text.strip()
            start_range = text.strip()
        parsed_sections.append({"tag": tag, "start_range": start_range})

    for i, sec in enumerate(parsed_sections):
        start_range = sec["start_range"]

        if i + 1 < len(parsed_sections):
            next_start = parsed_sections[i + 1]["start_range"]
            try:
                next_start_page = int(next_start)
                end_range = str(next_start_page - 1)
            except ValueError:
                end_range = next_start
        else:
            end_range = "Z"
        toc_sections.append({
            "tag": sec["tag"],
            "start_range": str(start_range),
            "end_range": end_range
        })
    return toc_sections

def parse_toc_content(sections, toc_sections):
    extracted = []
    for toc in toc_sections:
        start = toc["start_range"]
        end = toc["end_range"]
        end_num = int(end) if end.isdigit() else 9999
        start_num = int(start) if start.isdigit() else 1

        content_sections = []
        for section in sections:
            page_num = section.get("metadata", {}).get("page_number")
            if page_num is None:
                continue
            if start_num <= int(page_num) <= end_num:
                content_sections.append(section)

        subheadings = []
        current_sub = None
        for sec in content_sections:
            if sec.get("type") == "Footer":
                continue
            if sec["type"] == "Title" and sec["text"].strip() != toc["tag"]:
                if current_sub:
                    subheadings.append(current_sub)
                current_sub = {"tag": sec["text"].strip(), "content": []}
            elif sec["type"] != "Title":
                if current_sub:
                    current_sub["content"].append({
                        "text": sec.get("text", ""),
                        "page_number": sec.get("metadata", {}).get("page_number", "")
                    })
                else:
                    current_sub = {"tag": "Introduction", "content": [{
                        "text": sec.get("text", ""),
                        "page_number": sec.get("metadata", {}).get("page_number", ""),
                  }]}
        if current_sub:
            subheadings.append(current_sub)

        extracted.append({
            "title": toc["tag"],
            "start_range": toc["start_range"],
            "end_range": toc["end_range"],
            "content": subheadings
        })
    return extracted

def get_table_page_numbers(table_elements):
    pages = set()
    for el in table_elements:
        category = el.get("category") if isinstance(el, dict) else getattr(el, "category", None)
        metadata = el.get("metadata") if isinstance(el, dict) else getattr(el, "metadata", None)
        page_number = None
        if metadata:
            page_number = metadata.get("page_number") if isinstance(metadata, dict) else getattr(metadata, "page_number", None)
        if category == "Table" and page_number is not None:
            pages.add(int(page_number))
    return pages

def filter_out_table_pages_from_extracted(extracted, table_pages):
    for section in extracted:
        for sub in section["content"]:
            sub["content"] = [
                item for item in sub["content"]
                if int(item.get("page_number", -1)) not in table_pages
            ]
    return extracted

if __name__ == "__main__":

    if os.path.exists("output.json"):
        with open("output.json", "r") as f:
            sections = json.load(f)
    else:
        sections = extract_pdf_chunks("Annexure-1-Business Domain Validation-ICGv1.6_ formatted.pdf")
        sections_dicts = [el.to_dict() if hasattr(el, "to_dict") else el for el in sections]
        with open("output.json", "w") as f:
            json.dump(sections_dicts, f)
        sections = sections_dicts

    if os.path.exists("tables_output.json"):
        with open("tables_output.json", "r") as f:
            table_elements = json.load(f)
    else:
        table_elements = partition_pdf(
            filename="Annexure-1-Business Domain Validation-ICGv1.6_ formatted.pdf",
            skip_infer_table_types=False,
            strategy='hi_res',
        )
        table_elements = [el.to_dict() if hasattr(el, "to_dict") else el for el in table_elements]
        with open("tables_output.json", "w") as f:
            json.dump(table_elements, f)

    table_pages = get_table_page_numbers(table_elements)

    save_table_screenshots_from_unstructured(table_elements, "tables")

    title_sections = [section for section in sections if section["type"] == "Title"]
    with open("titles.json", "w") as f:
        json.dump(title_sections, f)
    toc_sections = extract_toc(sections)
    toc_sections = clean_toc_sections(toc_sections)
    with open("toc.json", "w") as f:
        json.dump(toc_sections, f)

    extracted = parse_toc_content(sections, toc_sections)
    extracted = filter_out_table_pages_from_extracted(extracted, table_pages)
    with open("extracted.json", "w") as f:
        json.dump(extracted, f, indent=2)

    extract_images_from_pdf("Annexure-1-Business Domain Validation-ICGv1.6_ formatted.pdf", "figures")
