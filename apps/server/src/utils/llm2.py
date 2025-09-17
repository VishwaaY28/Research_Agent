import logging
import asyncio
from typing import List, Dict, Any, Optional
from transformers import pipeline

logger = logging.getLogger(__name__)


class HuggingFaceLLMClient:
    def __init__(self, model_name: str = "gpt2"):
        self.model_name = model_name
        self._client = None

    def _get_client(self):
        if self._client is None:
            # instantiate lazily to avoid startup cost
            self._client = pipeline("text-generation", model=self.model_name)
        return self._client

    async def generate_content(
        self,
        prompt: str,
        context_sections: Optional[List[str]] = None,
        context_images: Optional[List[Dict[str, Any]]] = None,
        context_tables: Optional[List[Dict[str, Any]]] = None,
        section_name: str = "Generated Content",
        max_length: int = 512
    ) -> Dict[str, Any]:
        """Generate content using a Hugging Face text-generation model.

        Returns a dict: { content: str, context_tokens: int, response_tokens: int }
        The method is async but runs the blocking HF pipeline in a thread executor.
        """
        try:
            # Build a compact workspace context from provided pieces
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

            # Build a clearer system instruction separate from the workspace content to
            # reduce the chance the model will simply echo the chunks.
            system_prompt = f"""
You are a professional proposal writer for a reputed IT Services enterprise.
You will help draft a specific section of a business proposal based strictly on the content provided below from a Workspace.

Your response must follow these principles:
- Use only the information provided in the Workspace. Do not assume or invent additional content.
- Maintain an enterprise-grade, business-professional tone.
- Ensure that the writing reflects the company's credibility, experience, and strategic value.
- Use clear, confident, and well-structured language suitable for external stakeholders such as clients, procurement teams, and decision-makers.

---
### ✏️ Section to be Written:
{section_name}

### 🗂 Workspace Content:
\"\"\"
{workspace_content}
\"\"\"

---
 Instructions:
- Synthesize and summarize the workspace content into a coherent, well-written section.
- If the content spans multiple ideas, organize them into logical paragraphs or bullet points as appropriate and add necessary spacings everwhere.
- Do not repeat raw content or include citations/attributions. The output should be ready to copy-paste into a client-facing proposal.
"""


            user_message = f"Section: {section_name}\nGuidance: {prompt}\n"

            full_prompt = system_prompt + "\nWorkspace Content:\n" + workspace_content + "\n" + user_message

            # Run the blocking pipeline in a thread to avoid blocking the event loop.
            # Use sampling parameters and return_full_text=False to reduce prompt echoing.
            client = self._get_client()
            loop = asyncio.get_event_loop()
            def call_pipeline():
                return client(
                    full_prompt,
                    max_length=max_length,
                    num_return_sequences=1,
                    do_sample=True,
                    temperature=0.3,
                    top_p=0.9,
                    return_full_text=True
                )
            resp = await loop.run_in_executor(None, call_pipeline)

            generated_text = None
            if isinstance(resp, list) and len(resp) > 0 and isinstance(resp[0], dict):
                generated_text = resp[0].get('generated_text') or resp[0].get('text') or str(resp[0])
            else:
                generated_text = str(resp)

            # Post-process: strip echoed workspace content or guidance and clean JSON/code fences
            generated_text = generated_text.strip()

            # Remove common system prompt echoes
            system_echo_phrases = [
                "You are a professional proposal writer",
                "Your job is to synthesize the provided workspace context",
                "Respond ONLY with the final section text",
            ]
            for phrase in system_echo_phrases:
                if phrase in generated_text:
                    generated_text = generated_text.split(phrase, 1)[-1].strip()

            # Remove the workspace prefix if echoed
            if workspace_content and generated_text.startswith(workspace_content[:200]):
                generated_text = generated_text[len(workspace_content):].lstrip()

            # Remove repeated user guidance if present
            if generated_text.startswith(user_message):
                generated_text = generated_text[len(user_message):].lstrip()

            # Strip code fences and leading/trailing markdown
            import re, json
            # remove triple-backtick blocks
            generated_text = re.sub(r"```.*?```", "", generated_text, flags=re.S).strip()

            # If output is JSON-like (the model echoed the raw workspace JSON), try to parse
            if generated_text.startswith("{") or generated_text.startswith("["):
                try:
                    parsed = json.loads(generated_text)
                    texts = []
                    if isinstance(parsed, list):
                        for item in parsed:
                            if isinstance(item, dict):
                                # common field names that may contain text
                                for key in ("text", "generated_text", "content", "output"):
                                    if key in item and isinstance(item[key], str):
                                        texts.append(item[key])
                                # if nested structure, attempt to stringify
                                if not texts:
                                    texts.append(json.dumps(item))
                    elif isinstance(parsed, dict):
                        for key in ("text", "generated_text", "content", "output"):
                            if key in parsed and isinstance(parsed[key], str):
                                texts.append(parsed[key])
                        if not texts:
                            # join string values
                            for v in parsed.values():
                                if isinstance(v, str):
                                    texts.append(v)

                    if texts:
                        # join extracted text fields into a synthesized paragraph
                        generated_text = "\n\n".join(t.strip() for t in texts).strip()
                except Exception:
                    # not valid JSON, fallback to regex extraction
                    pass

            # If still contains quoted JSON-like fragments, extract any "text":"..." occurrences
            if '"text"' in generated_text or 'generated_text' in generated_text:
                try:
                    found = re.findall(r'"(?:generated_text|text)"\s*:\s*"([^"]+)"', generated_text)
                    if found:
                        generated_text = "\n\n".join(found).strip()
                except Exception:
                    pass

            # Final trim and ensure single clean block
            generated_text = generated_text.strip()

            # Simple token approximations (1 token ≈ 4 chars)
            context_tokens = max(1, len(workspace_content) // 4)
            response_tokens = max(1, len(generated_text) // 4)

            logger.info("HuggingFaceLLMClient: content generated")
            return {
                "content": generated_text.strip(),
                "context_tokens": context_tokens,
                "response_tokens": response_tokens
            }

        except Exception as e:
            logger.error(f"Error generating content with HuggingFaceLLMClient: {e}")
            raise


hugging_face_llm_client = HuggingFaceLLMClient()
