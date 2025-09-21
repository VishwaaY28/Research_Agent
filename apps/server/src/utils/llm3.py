import logging
from typing import List, Dict, Any, Optional
import tiktoken
import httpx
from config.env import env

logger = logging.getLogger(__name__)


def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """Count tokens in text using tiktoken, fallback to rough estimate."""
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception as e:
        logger.warning(f"llm3.count_tokens: tiktoken failed: {e}")
        return max(1, len(text) // 4)


class GroqClient:
    """Simple Groq API client wrapper for generating content.

    This implementation is intentionally defensive because the exact
    GROQ API contract may vary; it tries common response shapes.
    """

    def __init__(self):
        self._api_key = None
        self._api_base = None
        self._model = None

    def _load_config(self):
        if self._api_key is None or self._api_base is None:
            self._api_key = "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"
            # Use a safer default API base that matches common GROQ deployments; allow overriding via env
            self._api_base = env.get('GROQ_API_URL', 'https://api.groq.com/')
            self._model = env.get('GROQ_MODEL','openai/gpt-oss-120b')
            logger.info(f"Loaded GROQ config - base: {self._api_base}, model: {self._model}")
        return {
            'api_key': self._api_key,
            'api_base': self._api_base,
            'model': self._model,
        }

    def _headers(self):
        cfg = self._load_config()
        headers = {'Content-Type': 'application/json'}
        if cfg['api_key']:
            headers['Authorization'] = f"Bearer {cfg['api_key']}"
        return headers

    async def generate_content(
        self,
        prompt: str,
        context_sections: Optional[List[str]] = None,
        context_images: Optional[List[Dict[str, Any]]] = None,
        context_tables: Optional[List[Dict[str, Any]]] = None,
        section_name: str = "Generated Content",
        max_tokens: int = 600,
    ) -> Dict[str, Any]:
        """Generate content using the GROQ API.

        Returns: { content: str, context_tokens: int, response_tokens: int }
        """
        try:
            cfg = self._load_config()
            api_base = cfg['api_base']
            model = cfg['model']

            # Build compact workspace content
            workspace_content = ""
            if context_sections:
                workspace_content += "\n=== CONTENT SECTIONS ===\n"
                for i, section in enumerate(context_sections, 1):
                    workspace_content += f"\n{i}. {section}\n"

            if context_images:
                workspace_content += "\n=== IMAGES ===\n"
                for i, image in enumerate(context_images, 1):
                    caption = image.get('caption', 'No caption') if isinstance(image, dict) else str(image)
                    workspace_content += f"\n{i}. Image: {caption}\n"

            if context_tables:
                workspace_content += "\n=== TABLES ===\n"
                for i, table in enumerate(context_tables, 1):
                    caption = table.get('caption', 'No caption') if isinstance(table, dict) else str(table)
                    workspace_content += f"\n{i}. Table: {caption}\n"

            system_prompt = f"""
You are a professional proposal writer for a reputed IT Services enterprise.
You will help draft a specific section of a business proposal based strictly on the content provided below from a Workspace.

Output requirements:
- Provide a concise, client-ready section with headings and bullet lists where appropriate.
- Use only the workspace content and the user prompt as guidance.
"""

            user_message = f"Section: {section_name}\nUser guidance: {prompt}" if prompt else f"Section: {section_name}"
            full_prompt = system_prompt + "\n\n" + workspace_content + "\n\n" + user_message

            payload = {
                "model": model,
                "input": full_prompt,
                "max_tokens": max_tokens,
                "temperature": 0.25,
            }

            # Default endpoint path can vary; use /v1/generate by default to match common APIs
            # Try a sequence of common endpoint paths and payload shapes until one succeeds.
            candidate_paths = env.get('GROQ_GENERATE_PATH', '/openai/v1/chat/completions'),


            # payload variants: many GROQ-like endpoints accept either 'input' or 'prompt'
            payload_variants = [
                payload,
                {**payload, 'prompt': full_prompt, 'input': None},
                {**payload, 'prompt': full_prompt},
                {**payload, 'texts': [full_prompt]},
            ]

            last_error = None
            data = None
            async with httpx.AsyncClient(timeout=30.0) as client:
                for path in [p for p in candidate_paths if p]:
                    url = f"{api_base.rstrip('/')}{path}"
                    for pv in payload_variants:
                        # Clean None values out of payload
                        cleaned = {k: v for k, v in (pv or {}).items() if v is not None}
                        try:
                            logger.info(f"GROQ attempt -> POST {url} (payload keys: {list(cleaned.keys())})")
                            resp = await client.post(url, json=cleaned, headers=self._headers())
                        except Exception as e:
                            logger.warning(f"GROQ request failed for {url}: {e}")
                            last_error = e
                            continue

                        # If we get a non-JSON or error response, log and try next
                        if resp.status_code >= 400:
                            logger.warning(f"GROQ attempt returned {resp.status_code} for {url}: {resp.text}")
                            last_error = Exception(f"{resp.status_code} - {resp.text}")
                            continue

                        try:
                            data = resp.json()
                        except Exception as e:
                            logger.warning(f"Failed to parse JSON from GROQ at {url}: {e}")
                            last_error = e
                            continue

                        # success
                        logger.info(f"GROQ succeeded with {url}")
                        break
                    if data is not None:
                        break

            if data is None:
                # Raise the last encountered error with context
                err_msg = f"GROQ calls failed; last: {getattr(last_error, 'args', last_error)}"
                logger.error(err_msg)
                raise Exception(err_msg)

            # Try several common response shapes
            generated_text = ''
            if isinstance(data, dict):
                # Common shapes: {'output': 'text...'} or {'choices':[{'text': '...'}]}
                if 'output' in data and isinstance(data['output'], str):
                    generated_text = data['output']
                elif 'output' in data and isinstance(data['output'], list) and len(data['output']) > 0:
                    # sometimes output is array of tokens/objects
                    first = data['output'][0]
                    generated_text = first.get('text') if isinstance(first, dict) and first.get('text') else str(first)
                elif 'choices' in data and isinstance(data['choices'], list) and len(data['choices']) > 0:
                    first = data['choices'][0]
                    generated_text = first.get('text') or first.get('message') or str(first)
                elif 'generated_text' in data:
                    generated_text = data['generated_text']
                else:
                    # fallback to stringifying the main fields
                    generated_text = str(data)
            else:
                generated_text = str(data)

            generated_text = generated_text.strip()

            # Token approximations
            context_tokens = count_tokens(workspace_content)
            response_tokens = count_tokens(generated_text)

            logger.info("GROQ: content generated")
            return {
                "content": generated_text,
                "context_tokens": context_tokens,
                "response_tokens": response_tokens,
            }

        except Exception as e:
            logger.error(f"Error generating content with GROQ: {e}")
            raise


# Export a singleton client
groq_client = GroqClient()
