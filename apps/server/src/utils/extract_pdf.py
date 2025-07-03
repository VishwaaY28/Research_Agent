from unstructured.partition.pdf import partition_pdf

def extract_pdf_text(filepath: str) -> str:
    elements = partition_pdf(filename=filepath, extract_images_in_pdf=True, ocr_languages="eng")
    return "\n".join([el.text for el in elements if el.text])
