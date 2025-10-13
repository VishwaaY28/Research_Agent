import os
import json
import re
from pathlib import Path
import logging
from typing import List, Dict, Tuple, Union, Any
import fitz
from unstructured.partition.pdf import partition_pdf
from unstructured.documents.elements import Title, NarrativeText, ListItem, Text
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

# Ensure basic NLTK components are available at runtime; installation step should run downloads if needed.

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

        # Use a stricter threshold to avoid noisy tags
        keywords = [kw for kw, score in keyword_scores[:max_keywords * 2] if score > 0.2][:max_keywords]
        return keywords
    except Exception as e:
        logger.warning(f"Error extracting keywords: {e}")
        # Fallback to simple word frequency
        word_freq = Counter(words)
        return [word for word, freq in word_freq.most_common(max_keywords) if freq > 1]

def detect_heading_with_libraries(element: Union[Dict[str, Any], Any], doc: Any = None) -> bool:
    """Detect headers using unstructured and PyMuPDF features"""
    
    # First check if unstructured identified it as a Title
    if isinstance(element, Title):
        return True
        
    if not isinstance(element, (Text, NarrativeText, ListItem)) and not isinstance(element, dict):
        return False
        
    text = element.get("text", "") if isinstance(element, dict) else getattr(element, "text", "")
    text = text.strip()
    if not text:
        return False
        
    # Get font info if available in metadata
    metadata = element.get("metadata", {}) if isinstance(element, dict) else getattr(element, "metadata", {})
    font_info = metadata.get("font_info", {})
    
    # Check font properties that typically indicate headers
    is_bold = font_info.get("is_bold", False)
    font_size = font_info.get("font_size", 0)
    base_font_size = metadata.get("body_font_size", 0)
    
    # If we have font information, use it
    if font_info and base_font_size:
        # Headers are typically bold and larger than regular text
        if is_bold and font_size > base_font_size:
            return True
            
    # Fallback to pattern-based detection if no clear font signals
    # Skip single numbers or very short text
    if len(text) <= 3 or text.isdigit():
        return False

    # Headings don't typically end with punctuation
    if text.endswith(('.', '?', '!')):
        return False

    # Check for common heading patterns
    heading_patterns = [
        r'^[A-Z][A-Z\s]+$',  # ALL CAPS (but not single letters)
        r'^\d+\.?\s+[A-Z][a-z]',  # Numbered headings (must have text after number)
        r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,10}$',  # Title Case (short)
        r'^[IVX]+\.?\s+[A-Z][a-z]',  # Roman numerals (must have text after)
        r'^[A-Z]\.\s+[A-Z][a-z]',  # Letter numbering (must have text after)
    ]

    for pattern in heading_patterns:
        if re.match(pattern, text):
            return True

    return False

def detect_heading(text: str) -> bool:
    """Legacy pattern-based heading detection kept for compatibility."""
    if not text or len(text.strip()) < 3:
        return False

    text = text.strip()

    # Headings don't typically end with punctuation
    if text.endswith(('.', '?', '!')):
        return False

    # Skip single numbers or very short text
    if len(text) <= 3 and text.isdigit():
        return False

    # Check for common heading patterns
    heading_patterns = [
        r'^[A-Z][A-Z\s]+$',  # ALL CAPS (but not single letters)
        r'^\d+\.?\s+[A-Z][a-z]',  # Numbered headings (must have text after number)
        r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,10}$',  # Title Case (short)
        r'^[IVX]+\.?\s+[A-Z][a-z]',  # Roman numerals (must have text after)
        r'^[A-Z]\.\s+[A-Z][a-z]',  # Letter numbering (must have text after)
    ]

    for pattern in heading_patterns:
        if re.match(pattern, text):
            return True

    # Check if text is short and contains important words (but not just numbers)
    if (len(text) < 100 and
        not text.isdigit() and
        any(word in text.lower() for word in ['introduction', 'overview', 'summary', 'conclusion', 'methodology', 'results', 'analysis', 'discussion'])):
        return True

    return False

def generate_meaningful_title(text: str, max_length: int = 60) -> str:
    """Generate a meaningful title from text content"""
    if not text or len(text.strip()) < 10:
        return "Untitled Section"
    # Try to find a clear sentence that looks like a heading
    sentences = sent_tokenize(text)
    for sentence in sentences:
        s = sentence.strip()
        if detect_heading(s) and len(s) <= max_length:
            return s

    # Prefer keyword-based short titles to avoid using the raw first sentence
    keywords = extract_keywords(text, 4)
    if keywords:
        title = " ".join(keywords[:3]).title()
        if len(title) <= max_length:
            return title
        return title[:max_length-3] + "..."

    # If no keywords, fall back to first sentence (truncated if needed)
    if sentences:
        first_sentence = sentences[0].strip()
        if len(first_sentence) <= max_length:
            return first_sentence
        return first_sentence[:max_length-3] + "..."

    return "Content Section"

def auto_tag_chunk(content: str, major_title: str = None) -> List[str]:
    """Generate refined auto tags for a chunk"""
    if not content or len(content.strip()) < 20:
        return []

    def kebab(text: str) -> str:
        return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

    tags: List[str] = []

    # Add major title as tag if provided (shortened to top 3 words)
    if major_title:
        title_words = [w for w in re.sub(r"[^\w\s]", " ", major_title).split() if len(w) > 2][:3]
        if title_words:
            tags.append(kebab(" ".join(title_words)))

    # Extract keywords as tags
    keywords = extract_keywords(content, 4)
    tags.extend([kebab(kw) for kw in keywords])

    # Domain signals with stricter inclusion (must appear at least twice)
    content_words = re.findall(r"[a-zA-Z]+", content.lower())
    freq = Counter(content_words)
    domain_terms = [
        ("introduction", 2), ("overview", 2), ("background", 2),
        ("methodology", 2), ("approach", 2), ("process", 2),
        ("results", 2), ("findings", 2), ("outcomes", 2),
        ("conclusion", 2), ("summary", 2), ("recommendations", 2),
        ("analysis", 2), ("evaluation", 2), ("assessment", 2)
    ]
    for term, min_count in domain_terms:
        if freq.get(term, 0) >= min_count:
            tags.append(kebab(term))

    # Prune overly generic/short tags and dedupe; cap to 3
    generic_blocklist = {"data", "information", "content", "section", "text", "page", "document"}
    cleaned = []
    for t in tags:
        if not t or len(t) < 3:
            continue
        if t in generic_blocklist:
            continue
        if t not in cleaned:
            cleaned.append(t)
        # Stop at 3 tags to avoid excessive tagging
        if len(cleaned) >= 3:
            break

    return cleaned[:3]

def _merge_minor_chunks(minor_chunks: List[Dict], max_minors: int = 6, min_chars: int = 800) -> List[Dict]:
    """Merge adjacent minor chunks to reduce count and ensure size thresholds."""
    if not minor_chunks:
        return minor_chunks

    # Normalize content strings
    def content_text(mc: Dict) -> str:
        if isinstance(mc.get("content"), list) and mc["content"]:
            return " ".join([c.get("text", "") for c in mc["content"] if isinstance(c, dict)])
        if isinstance(mc.get("content"), str):
            return mc["content"]
        return ""

    # First, merge too-small chunks with previous
    merged: List[Dict] = []
    for mc in minor_chunks:
        txt = content_text(mc)
        if merged and len(txt) < min_chars:
            prev = merged[-1]
            prev_txt = content_text(prev)
            combined = (prev_txt + "\n\n" + txt).strip()
            prev["content"] = [{"text": combined, "page_number": None}]
            # Re-title based on combined and merge tags (limit to 3)
            prev["tag"] = generate_meaningful_title(combined)
            all_tags = list(dict.fromkeys((prev.get("tags") or []) + (mc.get("tags") or [])))
            prev["tags"] = all_tags[:3]
        else:
            merged.append(mc)

    # If still too many, iteratively merge adjacent pairs until under cap
    while len(merged) > max_minors:
        new_list: List[Dict] = []
        i = 0
        while i < len(merged):
            if i == len(merged) - 1:
                new_list.append(merged[i])
                break
            a, b = merged[i], merged[i+1]
            a_txt = content_text(a)
            b_txt = content_text(b)
            combined = (a_txt + "\n\n" + b_txt).strip()
            all_tags = list(dict.fromkeys((a.get("tags") or []) + (b.get("tags") or [])))
            combined_mc = {
                "tag": generate_meaningful_title(combined),
                "content": [{"text": combined, "page_number": None}],
                "tags": all_tags[:3]
            }
            new_list.append(combined_mc)
            i += 2
        merged = new_list

    return merged

def _merge_fallback_chunks_to_max(chunks: List[Dict], max_chunks: int = 20) -> List[Dict]:
    """Merge adjacent fallback chunks until count <= max_chunks."""
    if len(chunks) <= max_chunks:
        return chunks
    def get_text(ch: Dict) -> str:
        return ch.get("content", "") or ""
    merged = chunks[:]
    while len(merged) > max_chunks and len(merged) > 1:
        new_list: List[Dict] = []
        i = 0
        while i < len(merged):
            if i == len(merged) - 1:
                new_list.append(merged[i])
                break
            a, b = merged[i], merged[i+1]
            combined_text = (get_text(a) + "\n\n" + get_text(b)).strip()
            title = generate_meaningful_title(combined_text)
            new_chunk = {
                "file_source": a.get("file_source"),
                "title": title,
                "start_page": None,
                "end_page": None,
                "content": [{
                    "tag": title,
                    "content": [{"text": combined_text, "page_number": None}],
                    "tags": auto_tag_chunk(combined_text)[:3]
                }],
                "tags": auto_tag_chunk(combined_text)[:3]
            }
            new_list.append(new_chunk)
            i += 2
        merged = new_list
    return merged

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


def enrich_elements_with_font_info(filepath: str, elements: List[Dict]) -> List[Dict]:
    """Use PyMuPDF to annotate elements with approximate font sizes and bold flags.

    This is heuristic: we map spans on each page to elements by substring matching of span text
    inside element text. We compute a page median font size to act as body font size baseline.
    """
    try:
        doc = fitz.open(filepath)
    except Exception as e:
        logger.debug(f"Could not open PDF for font enrichment: {e}")
        return elements

    # Build spans per page
    page_spans = {}
    for p in range(len(doc)):
        try:
            page = doc[p]
            text_dict = page.get_text("dict")
            spans = []
            for block in text_dict.get("blocks", []):
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        spans.append({
                            "text": span.get("text", "").strip(),
                            "size": span.get("size", 0),
                            "font": span.get("font", "")
                        })
            page_spans[p + 1] = spans
        except Exception:
            page_spans[p + 1] = []

    # Compute median font per page
    import statistics
    page_median = {}
    for pg, spans in page_spans.items():
        sizes = [s["size"] for s in spans if s.get("size")]
        if sizes:
            try:
                page_median[pg] = statistics.median(sizes)
            except Exception:
                page_median[pg] = sizes[0]
        else:
            page_median[pg] = 0

    # Annotate elements
    for el in elements:
        meta = el.setdefault("metadata", {})
        pg = meta.get("page_number")
        if not pg:
            continue
        spans = page_spans.get(pg, [])
        median = page_median.get(pg, 0) or 0

        el_text = (el.get("text") or "").strip()
        # find best matching span by substring presence
        best_size = None
        best_font = ""
        lower_text = el_text.lower()
        for s in spans:
            stext = (s.get("text") or "").strip()
            if not stext:
                continue
            if stext.lower() in lower_text or lower_text in stext.lower():
                if best_size is None or s.get("size", 0) > best_size:
                    best_size = s.get("size", 0)
                    best_font = s.get("font", "")

        if best_size is None:
            best_size = median

        font_name = (best_font or "").lower()
        is_bold = any(k in font_name for k in ("bold", "black", "semibold", "demi"))

        meta["font_info"] = {
            "font_size": best_size or 0,
            "is_bold": bool(is_bold),
            "body_font_size": median or 0,
        }

    try:
        doc.close()
    except Exception:
        pass

    return elements

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

    # Try to open the PDF with PyMuPDF for additional font analysis
    doc = None
    if elements and isinstance(elements[0], dict):
        pdf_path = elements[0].get("metadata", {}).get("filename")
        if pdf_path:
            try:
                doc = fitz.open(pdf_path)
            except Exception as e:
                logger.warning(f"Could not open PDF with PyMuPDF: {e}")

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
        min_chunk_size = 300  # Minimum content size for a minor chunk

        for el in section_elements:
            text = el.get("text", "").strip()
            page_number = el.get("metadata", {}).get("page_number")

            if not text:
                continue

            # Stricter heading check: prefer library-based detection (uses element metadata),
            # fall back to pattern-based detection for plain text elements
            try:
                is_heading = detect_heading_with_libraries(el)
            except Exception:
                is_heading = detect_heading(text)
            is_heading = is_heading and text != title

            # If we find a heading and there is accumulated content, finalize that accumulated content
            if is_heading and current_content and len(" ".join(current_content)) > min_chunk_size:
                content_text = " ".join(current_content)
                # Determine previous chunk tag: prefer any existing heading_text, otherwise generate
                prev_heading = current_minor.get("heading_text") if current_minor else None
                if prev_heading and detect_heading(prev_heading):
                    prev_tag = prev_heading
                else:
                    prev_tag = generate_meaningful_title(content_text)
                finalized_prev = {
                    "tag": prev_tag,
                    "content": [{"text": content_text, "page_number": page_number}],
                    "tags": auto_tag_chunk(content_text, title)
                }
                minor_chunks.append(finalized_prev)
                current_minor = None
                current_content = []

            # If this element is a heading, start a new minor chunk (store heading_text for later)
            if is_heading:
                # Start a new minor chunk placeholder; capture heading font_info and page for validation
                current_minor = {
                    "heading_text": text,
                    "font_info": el.get("metadata", {}).get("font_info", {}),
                    "page_number": page_number,
                    "content": []
                }
                # reset content accumulator for the new chunk
                current_content = []
                continue

            # Otherwise, accumulate content for the current minor chunk
            current_content.append(text)
            if not current_minor:
                current_minor = {"heading_text": None, "font_info": None, "page_number": page_number, "content": []}


        # Finalize the last chunk
        if current_minor or current_content:
            content_text = " ".join(current_content) if current_content else ""
            heading_text = current_minor.get("heading_text") if current_minor else None

            if content_text:
                # Validate heading_text using library detection if available
                tag = None
                if heading_text:
                    try:
                        fake_el = {"text": heading_text, "metadata": {"font_info": current_minor.get("font_info", {}), "page_number": current_minor.get("page_number")}}
                        if detect_heading_with_libraries(fake_el):
                            tag = heading_text
                    except Exception:
                        pass
                if not tag:
                    tag = generate_meaningful_title(content_text)
                finalized = {
                    "tag": tag,
                    "content": [{"text": content_text, "page_number": page_number}],
                    "tags": auto_tag_chunk(content_text, title)
                }
                minor_chunks.append(finalized)
            else:
                # No content accumulated; create a small stub chunk from the heading text
                if heading_text:
                    finalized = {
                        "tag": heading_text,
                        "content": [{"text": heading_text, "page_number": page_number}],
                        "tags": auto_tag_chunk(heading_text, title)
                    }
                    minor_chunks.append(finalized)

        # If no minor chunks were created, create one from all content
        if not minor_chunks:
            all_content = ' '.join([el.get("text", "").strip() for el in section_elements if el.get("text", "").strip()])
            if all_content:
                minor_chunks.append({
                    "tag": generate_meaningful_title(all_content),
                    "content": [{"text": all_content, "page_number": start_page}],
                    "tags": auto_tag_chunk(all_content, title)
                })

        # Post-process: merge to reduce minor chunks
        minor_chunks = _merge_minor_chunks(minor_chunks, max_minors=6, min_chars=800)

        chunks.append({
            "title": title,
            "start_page": start_page,
            "end_page": end_page - 1,
            "content": minor_chunks,
            "tags": auto_tag_chunk(' '.join([chunk["content"][0]["text"] for chunk in minor_chunks if chunk["content"]]), title)
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
        elements = partition_pdf(filename=filepath, pdf_infer_table_structure =False)
        sections_dicts = [el.to_dict() if hasattr(el, "to_dict") else el for el in elements]
        with open(output_json_name, "w") as f:
            json.dump(sections_dicts, f)
        logger.info(f"Saved sections to {output_json_name}")

    # Filter out footers using both type/category and patterns
    sections_dicts = filter_footer_content(sections_dicts)

    # Enrich elements with font metadata where possible to improve heading detection
    try:
        sections_dicts = enrich_elements_with_font_info(filepath, sections_dicts)
    except Exception as e:
        logger.debug(f"Font enrichment skipped: {e}")

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

            # Check if this element is a heading. Prefer library-based detection when element has metadata.
            try:
                if isinstance(el, dict):
                    is_heading = detect_heading_with_libraries(el)
                else:
                    is_heading = detect_heading(text)
            except Exception:
                is_heading = detect_heading(text)
            # Treat explicit 'Title' type as a heading as well
            if el.get("type") == "Title":
                is_heading = True

            if is_heading and buffer and len(buffer) > 1000:
                # Finalize current chunk
                content = clean_content(buffer)
                title = generate_meaningful_title(content)
                chunks.append({
                    "file_source": filepath,
                    "title": title,
                    "start_page": None,
                    "end_page": None,
                    "content": [{
                        "tag": title,
                        "content": [{"text": content, "page_number": None}],
                        "tags": auto_tag_chunk(content)
                    }],
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
                    "title": title,
                    "start_page": None,
                    "end_page": None,
                    "content": [{
                        "tag": title,
                        "content": [{"text": content, "page_number": None}],
                        "tags": auto_tag_chunk(content)
                    }],
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
                "title": title,
                "start_page": None,
                "end_page": None,
                "content": [{
                    "tag": title,
                    "content": [{"text": content, "page_number": None}],
                    "tags": auto_tag_chunk(content)
                }],
                "tags": auto_tag_chunk(content)
            })
        # Cap total chunks to max 20 by merging
        if len(chunks) > 20:
            chunks = _merge_fallback_chunks_to_max(chunks, max_chunks=20)
    cache_data = {'chunks': chunks}
    save_extracted_cache(filepath, cache_data)
    logger.info(f"Extraction complete: {len(chunks)} chunks")
    return chunks
