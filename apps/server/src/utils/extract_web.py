import os
import json
import requests
from bs4 import BeautifulSoup
from unstructured.partition.html import partition_html
from typing import List, Dict, Tuple, Optional
import urllib.parse
from pathlib import Path
import logging
import re
from collections import Counter
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from utils.clean import clean_content
from utils.cache import check_extracted_cache, save_extracted_cache
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# # Initialize NLTK components
# try:
#     nltk.data.find('tokenizers/punkt')
#     nltk.data.find('corpora/stopwords')
#     nltk.data.find('corpora/wordnet')
# except LookupError:
#     nltk.download('punkt')
#     nltk.download('stopwords')
#     nltk.download('wordnet')

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0"
]
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

def detect_heading(text: str) -> bool:
    """Detect if text is likely a heading based on patterns"""
    if not text or len(text.strip()) < 3:
        return False

    text = text.strip()

    # Skip single numbers or very short text
    if len(text) <= 3 and text.isdigit():
        return False

    # Check for common heading patterns
    heading_patterns = [
        r'^[A-Z][A-Z\s]+$',  # ALL CAPS (but not single letters)
        r'^\d+\.?\s+[A-Z][a-z]',  # Numbered headings (must have text after number)
        r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$',  # Title Case (multiple words)
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

def extract_tables_from_soup(soup: BeautifulSoup) -> List[Dict]:
    """Extract table data from BeautifulSoup object"""
    tables = []
    for table in soup.find_all('table'):
        table_data = []
        headers = []

        # Extract headers
        header_row = table.find('tr')
        if header_row:
            for th in header_row.find_all(['th', 'td']):
                headers.append(th.get_text(strip=True))

        # Extract rows
        rows = table.find_all('tr')[1:] if header_row else table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if cells:
                row_data = [cell.get_text(strip=True) for cell in cells]
                table_data.append(row_data)

        if table_data:
            # Convert table to readable text format
            table_text = "Table:\n"
            if headers:
                table_text += " | ".join(headers) + "\n"
                table_text += " | ".join(["---"] * len(headers)) + "\n"

            for row in table_data:
                table_text += " | ".join(row) + "\n"

            tables.append({
                "type": "Table",
                "text": table_text.strip(),
                "headers": headers,
                "data": table_data
            })

    return tables

def clean_html_content(soup: BeautifulSoup) -> BeautifulSoup:
    """Clean HTML content by removing unwanted elements"""
    # Remove script and style elements
    for script in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        script.decompose()

    # Remove elements with common navigation/footer classes
    unwanted_classes = [
        'nav', 'navigation', 'menu', 'sidebar', 'footer', 'header',
        'breadcrumb', 'pagination', 'social', 'share', 'advertisement',
        'ads', 'banner', 'popup', 'modal', 'cookie', 'privacy',
        'comment', 'comments', 'related', 'recommended', 'sponsored',
        'newsletter', 'subscribe', 'login', 'signup', 'search',
        'toolbar', 'widget', 'sidebar', 'sidebar-content'
    ]

    for class_name in unwanted_classes:
        for element in soup.find_all(class_=re.compile(class_name, re.I)):
            element.decompose()

    # Remove elements with common navigation/footer IDs
    unwanted_ids = [
        'nav', 'navigation', 'menu', 'sidebar', 'footer', 'header',
        'breadcrumb', 'pagination', 'social', 'share', 'advertisement',
        'ads', 'banner', 'popup', 'modal', 'cookie', 'privacy',
        'comment', 'comments', 'related', 'recommended', 'sponsored',
        'newsletter', 'subscribe', 'login', 'signup', 'search',
        'toolbar', 'widget', 'sidebar', 'sidebar-content'
    ]

    for id_name in unwanted_ids:
        for element in soup.find_all(id=re.compile(id_name, re.I)):
            element.decompose()

    # Remove elements with data attributes that indicate non-content
    for element in soup.find_all(attrs={"data-testid": re.compile(r"(nav|menu|footer|header|ad|banner)", re.I)}):
        element.decompose()

    for element in soup.find_all(attrs={"role": re.compile(r"(navigation|banner|contentinfo|complementary)", re.I)}):
        element.decompose()

    # Remove elements that are likely ads or tracking
    for element in soup.find_all(attrs={"class": re.compile(r"(google|facebook|twitter|instagram|linkedin|youtube)", re.I)}):
        element.decompose()

    return soup

def is_meaningful_content(text: str) -> bool:
    """Check if text contains meaningful content worth extracting"""
    if not text or len(text.strip()) < 10:
        return False

    text = text.strip()

    # Skip very short text
    if len(text) < 10:
        return False

    # Skip text that's mostly numbers, symbols, or whitespace
    if len(re.sub(r'[^\w\s]', '', text)) < len(text) * 0.3:
        return False

    # Skip common navigation/footer text patterns
    skip_patterns = [
        r'^(home|about|contact|privacy|terms|login|register|search|menu)$',
        r'^(copyright|©|all rights reserved)',
        r'^(page \d+|\d+ of \d+)$',
        r'^(next|previous|back|continue|more)$',
        r'^(\d+)$',  # Just numbers
        r'^[^\w\s]*$',  # Only symbols
    ]

    for pattern in skip_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            return False

    return True

def extract_structured_content(soup: BeautifulSoup) -> List[Dict]:
    """Extract structured content from cleaned HTML with better filtering"""
    elements = []

    # Extract tables first
    tables = extract_tables_from_soup(soup)
    elements.extend(tables)

    # Extract headings and content with better filtering
    for element in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'section', 'article', 'li', 'blockquote']):
        text = element.get_text(strip=True)
        if not is_meaningful_content(text):
            continue

        tag_name = element.name.lower()

        # Determine element type with better logic
        if tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            element_type = "Title"
        elif tag_name in ['p', 'li', 'blockquote']:
            element_type = "Text"
        elif tag_name in ['div', 'section', 'article']:
            # Check if it contains meaningful content
            if len(text) > 50 and not any(child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] for child in element.find_all()):
                element_type = "Text"
            else:
                continue  # Skip container elements
        else:
            element_type = "Text"

        # Additional quality checks
        if element_type == "Text" and len(text) < 20:
            continue  # Skip very short text blocks

        elements.append({
            "type": element_type,
            "text": text,
            "tag": tag_name
        })

    return elements

def merge_split_titles(elements):
    """Merge split titles that were broken across multiple elements"""
    merged = []
    i = 0
    while i < len(elements):
        current = elements[i]
        if (current.get("type") == "Title" and current.get("text") and len(current["text"].strip()) < 100):
            j = i + 1
            title_text = current["text"].strip()
            while j < len(elements):
                next_el = elements[j]
                next_text = next_el.get("text", "").strip()
                if (len(next_text) < 50 and not next_text.endswith('.') and next_el.get("type") in ["Title", "Text"]):
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

def identify_topic_sections(elements: List[Dict]) -> List[Dict]:
    """Identify topic sections and group related content"""
    sections = []
    current_section = {
        "title": "Introduction",
        "content": [],
        "level": 0
    }

    for element in elements:
        text = element.get("text", "").strip()
        element_type = element.get("type", "")
        tag = element.get("tag", "")

        if not text or not is_meaningful_content(text):
            continue

        # Determine heading level
        heading_level = 0
        if element_type == "Title":
            if tag in ['h1']:
                heading_level = 1
            elif tag in ['h2']:
                heading_level = 2
            elif tag in ['h3']:
                heading_level = 3
            elif tag in ['h4', 'h5', 'h6']:
                heading_level = 4
            elif detect_heading(text):
                heading_level = 2  # Default for detected headings

        # If we found a new major heading (h1, h2, or detected heading)
        if heading_level > 0 and heading_level <= 2:
            # Finalize current section if it has meaningful content
            if current_section["content"] and len(" ".join(current_section["content"])) >= 10:
                sections.append(current_section.copy())

            # Start new section
            current_section = {
                "title": text,
                "content": [],
                "level": heading_level
            }
        else:
            # Add content to current section
            current_section["content"].append(text)

    # Add final section
    if current_section["content"] and len(" ".join(current_section["content"])) >= 10:
        sections.append(current_section)

    return sections

def create_meaningful_chunks(sections: List[Dict], url: str) -> List[Dict]:
    """Create meaningful chunks from identified sections"""
    chunks = []

    for section in sections:
        title = section.get("title", "Untitled Section")
        content_list = section.get("content", [])

        if not content_list:
            continue

        # Combine all content for this section
        combined_text = "\n\n".join(content_list)

        # Skip if content is too short
        if len(combined_text.strip()) < 10:
            continue

        # Clean the content
        cleaned_text = clean_content(combined_text)

        # Create minor chunk
        minor = {
            "tag": generate_meaningful_title(cleaned_text),
            "content": [{"text": cleaned_text, "page_number": None}]
        }

        # Create chunk object
        chunk = {
            "file_source": url,
            "title": title,
            "content": [minor],
            "tags": auto_tag_chunk(cleaned_text, title)
        }

        chunks.append(chunk)

    return chunks

def chunk_content_by_headings(elements: List[Dict], url: str) -> List[Dict]:
    """Enhanced chunking that identifies topics and creates meaningful chunks"""
    # First, identify topic sections
    sections = identify_topic_sections(elements)
    logger.info(f"Identified {len(sections)} topic sections")

    # Create meaningful chunks from sections
    chunks = create_meaningful_chunks(sections, url)
    logger.info(f"Created {len(chunks)} meaningful chunks")

    # Filter out chunks that are too small
    filtered_chunks = []
    for chunk in chunks:
        # Get the text content from the chunk
        chunk_text = ""
        for minor in chunk.get("content", []):
            for content_item in minor.get("content", []):
                if isinstance(content_item, dict) and "text" in content_item:
                    chunk_text += content_item["text"] + " "

        # Only keep chunks with substantial content
        if len(chunk_text.strip()) >= 10:
            filtered_chunks.append(chunk)
        else:
            logger.debug(f"Filtered out small chunk: {chunk.get('title', 'Unknown')}")

    logger.info(f"After filtering small chunks: {len(filtered_chunks)} chunks remain")
    return filtered_chunks


#starting point
def extract_web_sections(url: str, figures_dir: str) -> List[Dict]:
    """Extract sections from web page using BeautifulSoup and unstructured"""
    logger.info(f"Starting web extraction for: {url}")

    cached_data = check_extracted_cache(url)
    if cached_data and 'chunks' in cached_data:
        logger.info("Using cached data")
        return cached_data['chunks']

    extracts_dir = "extracts"
    os.makedirs(extracts_dir, exist_ok=True)

    last_exc = None
    for agent in USER_AGENTS:
        try:
            logger.info(f"Trying with User-Agent: {agent[:50]}...")

            # Enhanced headers for better compatibility
            headers = {
                "User-Agent": agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            }

            resp = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
            resp.raise_for_status()

            # Check if we got HTML content
            content_type = resp.headers.get('content-type', '').lower()
            if 'text/html' not in content_type:
                logger.warning(f"Unexpected content type: {content_type}")
                continue

            logger.info(f"Successfully fetched content, length: {len(resp.text)}")

            # Parse with BeautifulSoup first
            soup = BeautifulSoup(resp.text, 'html.parser')

            # Clean the HTML
            soup = clean_html_content(soup)

            # Extract structured content
            elements = extract_structured_content(soup)
            logger.info(f"Extracted {len(elements)} elements from HTML")

            # Also try unstructured as fallback for better text extraction
            try:
                unstructured_elements = partition_html(text=resp.text, extract_images_in_html=False)
                unstructured_dicts = [el.to_dict() if hasattr(el, "to_dict") else el for el in unstructured_elements]
                unstructured_dicts = filter_footer_content(unstructured_dicts)

                # Merge with BeautifulSoup results, preferring BeautifulSoup for structure
                soup_elements_by_text = {el.get("text", ""): el for el in elements}
                for el in unstructured_dicts:
                    text = el.get("text", "").strip()
                    if text and text not in soup_elements_by_text:
                        elements.append(el)

                logger.info(f"Combined elements: {len(elements)} total")
            except Exception as e:
                logger.warning(f"Unstructured extraction failed: {e}, using BeautifulSoup only")

            # Save raw elements for debugging
            url_safe = url.replace("://", "_").replace("/", "_")[:50]
            sections_json_name = os.path.join(extracts_dir, f"web_sections_{url_safe}.json")
            with open(sections_json_name, "w", encoding='utf-8') as f:
                json.dump(elements, f, indent=2, ensure_ascii=False)

            # Merge split titles
            merged_elements = merge_split_titles(elements)
            logger.info(f"After merging titles: {len(merged_elements)} elements")

            # Filter out low-quality elements
            quality_elements = []
            for element in merged_elements:
                text = element.get("text", "").strip()
                if is_meaningful_content(text):
                    quality_elements.append(element)
                else:
                    logger.debug(f"Filtered out low-quality element: {text[:50]}...")

            logger.info(f"After quality filtering: {len(quality_elements)} elements")

            # Chunk content by headings with improved topic detection
            chunks = chunk_content_by_headings(quality_elements, url)
            logger.info(f"Created {len(chunks)} chunks after topic-based chunking")

            # Ensure each chunk has required fields and validate content
            valid_chunks = []
            for chunk in chunks:
                chunk.setdefault("file_source", url)

                # Extract and validate chunk text content
                chunk_text = ""
                for minor in chunk.get("content", []):
                    if isinstance(minor, dict) and "content" in minor:
                        for content_item in minor["content"]:
                            if isinstance(content_item, dict) and "text" in content_item:
                                chunk_text += content_item["text"] + " "

                # Only keep chunks with substantial content
                if len(chunk_text.strip()) >= 10:
                    if "tags" not in chunk:
                        chunk["tags"] = auto_tag_chunk(chunk_text, chunk.get("title"))
                    valid_chunks.append(chunk)
                else:
                    logger.debug(f"Filtered out chunk with insufficient content: {chunk.get('title', 'Unknown')}")

            chunks = valid_chunks
            logger.info(f"Final valid chunks: {len(chunks)}")

            # Cache the results
            cache_data = {'chunks': chunks}
            save_extracted_cache(url, cache_data)

            logger.info(f"Web extraction complete: {len(chunks)} chunks created")
            return chunks

        except requests.exceptions.RequestException as e:
            logger.warning(f"Request failed with {agent[:30]}...: {e}")
            last_exc = e
            continue
        except Exception as exc:
            logger.error(f"Unexpected error with {agent[:30]}...: {exc}")
            last_exc = exc
            continue

    logger.error(f"All User-Agents failed. Last error: {last_exc}")
    raise last_exc
