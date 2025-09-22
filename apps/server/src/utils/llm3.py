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

    This implementation uses the standard OpenAI-compatible Chat Completions API
    for GROQ, which requires a 'messages' array in the payload.
    """

    def __init__(self):
        self._api_key = None
        self._api_base = None
        self._model = None

    def _load_config(self):
        if self._api_key is None or self._api_base is None:
            # NEVER hardcode API keys in production code; always use env vars
            self._api_key = env.get('GROQ_API_KEY','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')
            if not self._api_key:
                raise ValueError("GROQ_API_KEY environment variable is required.")
            self._api_base = env.get('GROQ_API_URL', 'https://api.groq.com/openai/v1')
            self._model = env.get('GROQ_MODEL', 'llama-3.3-70b-versatile')  # Updated to a standard GROQ model; adjust as needed
            logger.info(f"Loaded GROQ config - base: {self._api_base}, model: {self._model}")
        return {
            'api_key': self._api_key,
            'api_base': self._api_base,
            'model': self._model,
        }

    def _headers(self):
        cfg = self._load_config()
        headers = {'Content-Type': 'application/json'}
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

            # Build workspace content (context)
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

            # System prompt (fixed role)
            system_prompt = f"""
You are a professional proposal writer for a reputed IT Services enterprise.
You will help draft a specific section of a business proposal based strictly on the content provided below from a Workspace.

Your response must follow these principles:
- Use only the information provided in the Workspace. Do not assume or invent additional content.
- Maintain an enterprise-grade, business-professional tone.
- Leave necessary blank spaces between each paragraph or section
- Ensure that the writing reflects the company's credibility, experience, and strategic value.
- Use clear, confident, and well-structured language suitable for external stakeholders such as clients, procurement teams, and decision-makers.

Output requirements (IMPORTANT):
- Format the response using well-structured.
- Include explicit sections with headings.
- Use bullet lists where appropriate for clarity.
- Use bold and/or italics to highlight important terms or recommendations.
- Leave a single blank line between paragraphs and list blocks for readability.
- Keep the output concise (aim for 3-8 short paragraphs or 6-12 bullet points) and suitable for direct copy-paste into a proposal document.

---
### ✏️ Section to be Written:
{section_name}

### 🗂 Workspace Content:
\"\"\"
{workspace_content}
\"\"\"

---
Instructions:
- Synthesize and summarize the workspace content into the coherent, well-written section.
- If the content spans multiple ideas, organize them into logical paragraphs or bullet points as appropriate.
- Do not repeat raw content or include citations/attributions. The output should be ready to copy-paste into a client-facing proposal.
"""


            # User message: Combine workspace context with user guidance
            user_message = f"Section: {section_name}\nUser  guidance: {prompt}" if prompt else f"Section: {section_name}"
            full_user_content = workspace_content + "\n\n" + user_message if workspace_content else user_message

            # Standard OpenAI-compatible payload for chat completions
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": full_user_content},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.25,
            }

            # Fixed endpoint for GROQ's OpenAI-compatible chat completions
            endpoint_path = "/chat/completions"
            url = f"{api_base.rstrip('/')}{endpoint_path}"

            last_error = None
            data = None
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Single attempt with the correct payload (no variants needed)
                cleaned_payload = {k: v for k, v in payload.items() if v is not None}
                try:
                    logger.info(f"GROQ attempt -> POST {url} (payload keys: {list(cleaned_payload.keys())})")
                    resp = await client.post(url, json=cleaned_payload, headers=self._headers())
                except Exception as e:
                    logger.warning(f"GROQ request failed for {url}: {e}")
                    last_error = e
                else:
                    if resp.status_code >= 400:
                        logger.warning(f"GROQ attempt returned {resp.status_code} for {url}: {resp.text}")
                        last_error = Exception(f"{resp.status_code} - {resp.text}")
                    else:
                        try:
                            data = resp.json()
                            logger.info(f"GROQ succeeded with {url}")
                        except Exception as e:
                            logger.warning(f"Failed to parse JSON from GROQ at {url}: {e}")
                            last_error = e

            if data is None:
                # Raise the last encountered error with context
                err_msg = f"GROQ calls failed; last: {getattr(last_error, 'args', str(last_error))}"
                logger.error(err_msg)
                raise Exception(err_msg)

            # Parse standard OpenAI chat response
            generated_text = ''
            if isinstance(data, dict) and 'choices' in data and isinstance(data['choices'], list) and len(data['choices']) > 0:
                first_choice = data['choices'][0]
                if isinstance(first_choice, dict) and 'message' in first_choice:
                    generated_text = first_choice['message'].get('content', '')
                else:
                    generated_text = str(first_choice)
            else:
                # Fallback for unexpected shapes (unlikely with standard API)
                logger.warning(f"Unexpected GROQ response shape: {data}")
                generated_text = str(data)

            generated_text = generated_text.strip()

            # Token approximations (note: tiktoken is approximate for non-OpenAI models)
            context_tokens = count_tokens(full_user_content)
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
