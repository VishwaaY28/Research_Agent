import os
import json
import re
from pathlib import Path
import logging
from typing import List, Dict, Tuple
from unstructured.partition.pdf import partition_pdf
from utils.cache import check_extracted_cache, save_extracted_cache
from utils.clean import clean_content
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from collections import Counter
import string

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize NLTK components
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('wordnet')

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

def extract_keywords(text: str, max_keywords: int = 5) -> List[str]:
    """Extract keywords from text using TF-IDF"""
    if not text or len(text.strip()) < 10:
        return []

    # Clean and preprocess text
    text = re.sub(r'[^\w\s]', ' ', text.lower())
    words = word_tokenize(text)
    words = [lemmatizer.lemmatize(word) for word in words if word not in stop_words and len(word) > 2]

    if len(words) < 3:
        return []

    # Use TF-IDF to extract keywords
    try:
        vectorizer = TfidfVectorizer(max_features=50, ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform([' '.join(words)])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray()[0]

        # Get top keywords
        keyword_scores = list(zip(feature_names, scores))
        keyword_scores.sort(key=lambda x: x[1], reverse=True)

        keywords = [kw for kw, score in keyword_scores[:max_keywords] if score > 0.1]
        return keywords
    except Exception as e:
        logger.warning(f"Error extracting keywords: {e}")
        # Fallback to simple word frequency
        word_freq = Counter(words)
        return [word for word, freq in word_freq.most_common(max_keywords) if freq > 1]

def detect_heading(text: str) -> bool:
    """Detect if text is likely a heading based on patterns"""
    if not text or len(text.strip()) < 3:
        return False

    text = text.strip()

    # Check for common heading patterns
    heading_patterns = [
        r'^[A-Z][A-Z\s]+$',  # ALL CAPS
        r'^\d+\.?\s+[A-Z]',  # Numbered headings
        r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$',  # Title Case
        r'^[IVX]+\.?\s+[A-Z]',  # Roman numerals
        r'^[A-Z]\.\s+[A-Z]',  # Letter numbering
    ]

    for pattern in heading_patterns:
        if re.match(pattern, text):
            return True

    # Check if text is short and contains important words
    if len(text) < 100 and any(word in text.lower() for word in ['introduction', 'overview', 'summary', 'conclusion', 'methodology', 'results', 'analysis', 'discussion']):
        return True

    return False

def generate_meaningful_title(text: str, max_length: int = 60) -> str:
    """Generate a meaningful title from text content"""
    if not text or len(text.strip()) < 10:
        return "Untitled Section"

    # Try to find the first sentence that looks like a heading
    sentences = sent_tokenize(text)
    for sentence in sentences:
        sentence = sentence.strip()
        if detect_heading(sentence) and len(sentence) <= max_length:
            return sentence

    # If no heading found, use first sentence or create from keywords
    if sentences:
        first_sentence = sentences[0].strip()
        if len(first_sentence) <= max_length:
            return first_sentence
        else:
            # Truncate first sentence
            return first_sentence[:max_length-3] + "..."

    # Fallback: use keywords
    keywords = extract_keywords(text, 3)
    if keywords:
        return " ".join(keywords[:3]).title()

    return "Content Section"

def auto_tag_chunk(content: str, major_title: str = None) -> List[str]:
    """Generate auto tags for a chunk"""
    tags = []

    # Add major title as tag if provided
    if major_title:
        tags.append(major_title.lower().replace(' ', '-'))

    # Extract keywords as tags
    keywords = extract_keywords(content, 5)
    tags.extend([kw.replace(' ', '-') for kw in keywords])

    # Add content type tags based on patterns
    content_lower = content.lower()
    if any(word in content_lower for word in ['introduction', 'overview', 'background']):
        tags.append('introduction')
    if any(word in content_lower for word in ['methodology', 'approach', 'process']):
        tags.append('methodology')
    if any(word in content_lower for word in ['results', 'findings', 'outcomes']):
        tags.append('results')
    if any(word in content_lower for word in ['conclusion', 'summary', 'recommendations']):
        tags.append('conclusion')
    if any(word in content_lower for word in ['table', 'figure', 'chart', 'graph']):
        tags.append('data-visualization')
    if any(word in content_lower for word in ['analysis', 'evaluation', 'assessment']):
        tags.append('analysis')

    # Remove duplicates and limit to 8 tags
    unique_tags = list(dict.fromkeys(tags))[:4]
    return [tag for tag in unique_tags if len(tag) > 2]

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
    then subdivide into fewer, more meaningful minor chunks using NLP techniques.
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

        # Improved minor chunking: group content more intelligently
        minor_chunks = []
        current_minor = None
        current_content = []
        min_chunk_size = 500  # Minimum content size for a minor chunk

        for el in section_elements:
            text = el.get("text", "").strip()
            el_type = el.get("type", "")
            page_number = el.get("metadata", {}).get("page_number")

            if not text:
                continue

            # Check if this element is a heading
            is_heading = (el_type == "Title" and text != title) or detect_heading(text)

            if is_heading and current_minor and len(' '.join(current_content)) > min_chunk_size:
                # Finalize current chunk
                content_text = ' '.join(current_content)
                current_minor["content"] = [{"text": content_text, "page_number": page_number}]
                current_minor["tags"] = auto_tag_chunk(content_text, title)
                minor_chunks.append(current_minor)
                current_minor = None
                current_content = []

            if is_heading:
                # Start new minor chunk
                current_minor = {
                    "tag": text,
                    "content": []
                }
            else:
                # Add to current content
                current_content.append(text)

                # If we don't have a current minor chunk, create one
                if not current_minor:
                    current_minor = {
                        "tag": generate_meaningful_title(text),
                        "content": []
                    }

        # Finalize last chunk
        if current_minor and current_content:
            content_text = ' '.join(current_content)
            current_minor["content"] = [{"text": content_text, "page_number": page_number}]
            current_minor["tags"] = auto_tag_chunk(content_text, title)
            minor_chunks.append(current_minor)

        # If no minor chunks were created, create one from all content
        if not minor_chunks:
            all_content = ' '.join([el.get("text", "").strip() for el in section_elements if el.get("text", "").strip()])
            if all_content:
                minor_chunks.append({
                    "tag": generate_meaningful_title(all_content),
                    "content": [{"text": all_content, "page_number": start_page}],
                    "tags": auto_tag_chunk(all_content, title)
                })

        chunks.append({
            "title": title,
            "start_page": start_page,
            "end_page": end_page - 1,
            "content": minor_chunks,
            "tags": auto_tag_chunk(' '.join([chunk["content"][0]["text"] for chunk in minor_chunks]), title)
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
        elements = partition_pdf(filename=filepath, pdf_infer_table_structure =True)
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
        logger.info("Using fallback chunking with NLP-based titles")
        chunks = []
        buffer = ""
        current_heading = None

        for el in sections_dicts:
            text = el.get("text", "").strip()
            if not text:
                continue

            # Check if this element is a heading
            is_heading = detect_heading(text) or el.get("type") == "Title"

            if is_heading and buffer and len(buffer) > 1000:
                # Finalize current chunk
                content = clean_content(buffer)
                title = generate_meaningful_title(content)
                chunks.append({
                    "file_source": filepath,
                    "label": title,
                    "content": content,
                    "tags": auto_tag_chunk(content)
                })
                buffer = ""
                current_heading = text
            elif is_heading:
                current_heading = text
                if buffer:
                    buffer += text + "\n"
                else:
                    buffer = text + "\n"
            else:
                buffer += text + "\n"

            # Create chunk if buffer gets too large
            if len(buffer) > 3000:
                content = clean_content(buffer)
                title = generate_meaningful_title(content)
                chunks.append({
                    "file_source": filepath,
                    "label": title,
                    "content": content,
                    "tags": auto_tag_chunk(content)
                })
                buffer = ""
                current_heading = None

        # Finalize last chunk
        if buffer.strip():
            content = clean_content(buffer)
            title = generate_meaningful_title(content)
            chunks.append({
                "file_source": filepath,
                "label": title,
                "content": content,
                "tags": auto_tag_chunk(content)
            })
    cache_data = {'chunks': chunks}
    save_extracted_cache(filepath, cache_data)
    logger.info(f"Extraction complete: {len(chunks)} chunks")
    return chunks
