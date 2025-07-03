from unstructured.partition.docx import partition_docx

def extract_docx_text(filepath: str) -> str:
    elements = partition_docx(filename=filepath)
    return "\n".join([el.text for el in elements if el.text])
