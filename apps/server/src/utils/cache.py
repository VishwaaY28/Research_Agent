import os
import json
import hashlib

def get_cache_filename(filepath_or_url: str) -> str:
    """Generate a safe filename for caching based on file path or URL"""
    if os.path.exists(filepath_or_url):
        mtime = os.path.getmtime(filepath_or_url)
        content_hash = hashlib.md5(f"{filepath_or_url}_{mtime}".encode()).hexdigest()
    else:
        content_hash = hashlib.md5(filepath_or_url.encode()).hexdigest()

    safe_name = filepath_or_url.replace("://", "_").replace("/", "_").replace("\\", "_")[:50]
    return f"{safe_name}_{content_hash}.json"

def check_extracted_cache(filepath_or_url: str, extracts_dir: str = "extracts") -> dict:
    """Check if content has been previously extracted and cached"""
    if not os.path.exists(extracts_dir):
        return None

    cache_file = os.path.join(extracts_dir, get_cache_filename(filepath_or_url))
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    return None

def save_extracted_cache(filepath_or_url: str, data: dict, extracts_dir: str = "extracts"):
    """Save extracted content to cache"""
    os.makedirs(extracts_dir, exist_ok=True)
    cache_file = os.path.join(extracts_dir, get_cache_filename(filepath_or_url))
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except IOError:
        pass
