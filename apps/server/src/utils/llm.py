import openai
import logging
from typing import List, Dict, Any, Optional
from config.env import env

logger = logging.getLogger(__name__)

class OpenAIClient:
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=env.get("OPENAI_API_KEY", "ollama"),
            base_url=env.get("OPENAI_API_BASE_URL", "http://localhost:11434/v1"),
        )

    async def generate_content(
        self,
        prompt: str,
        context_sections: List[str] = None,
        context_images: List[Dict[str, Any]] = None,
        context_tables: List[Dict[str, Any]] = None,
        model: str = "llama3.2:1b"
    ) -> str:
        """
        Generate content based on prompt and context
        """
        try:
            system_prompt = """You are a professional proposal writer. Your task is to generate high-quality proposal content based on the user's prompt and provided context materials.

Guidelines:
1. Use the provided context sections, images, and tables as reference material
2. Generate content that is professional, coherent, and well-structured
3. Maintain consistency with the style and tone of the provided context
4. Include specific details and data from the context when relevant
5. Format the output using proper markdown structure
6. Ensure the content is tailored to the specific prompt requirements

Context Materials:"""

            if context_sections:
                system_prompt += f"\n\nCONTEXT SECTIONS:\n"
                for i, section in enumerate(context_sections, 1):
                    system_prompt += f"\n{i}. {section}\n"

            if context_images:
                system_prompt += f"\n\nCONTEXT IMAGES:\n"
                for i, image in enumerate(context_images, 1):
                    system_prompt += f"\n{i}. Image: {image.get('caption', 'No caption')}"
                    if image.get('ocr_text'):
                        system_prompt += f"\n   OCR Text: {image['ocr_text']}"

            if context_tables:
                system_prompt += f"\n\nCONTEXT TABLES:\n"
                for i, table in enumerate(context_tables, 1):
                    system_prompt += f"\n{i}. Table: {table.get('caption', 'No caption')}"
                    if table.get('data'):
                        system_prompt += f"\n   Data: {table['data']}"

            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Error generating content with OpenAI: {str(e)}")
            raise Exception(f"Content generation failed: {str(e)}")

openai_client = OpenAIClient()
