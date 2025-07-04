import os
import json
from typing import Dict, List

def get_cache_filename(filepath: str) -> str:
    basename = os.path.basename(filepath)
    return f"{basename}.json"

def check_extracted_cache(filepath: str, extracts_dir: str = "extracts") -> Dict:
    if not os.path.exists(extracts_dir):
        return None

    cache_file = os.path.join(extracts_dir, get_cache_filename(filepath))
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    return None

def save_extracted_cache(filepath: str, data: Dict, extracts_dir: str = "extracts"):
    os.makedirs(extracts_dir, exist_ok=True)
    cache_file = os.path.join(extracts_dir, get_cache_filename(filepath))
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except IOError:
        pass
