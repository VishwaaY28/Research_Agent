import re

def clean_content(text: str) -> str:
    text = re.sub(r'\n{2,}', '\n', text)
    text = re.sub(r'([^\n])\n([^\n])', r'\1 \2', text)
    return text.strip()
