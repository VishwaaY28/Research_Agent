import re

def clean_content(text: str) -> str:
    """Clean and normalize extracted text content"""
    if not text:
        return ""

    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n+', '\n', text)
    text = text.strip()

    return text
