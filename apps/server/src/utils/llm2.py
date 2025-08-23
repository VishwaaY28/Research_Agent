import logging
from transformers import pipeline

logger = logging.getLogger(__name__)

class HuggingFaceLLMClient:
    def __init__(self, model_name: str = "gpt2"):
        self.model_name = model_name
        self._client = pipeline("text-generation", model=self.model_name)

    async def generate_content(self, prompt: str, max_length: int = 150) -> str:
        """Generate content using Hugging Face model"""
        try:
            logger.info(f"Generating content with model: {self.model_name}")
            response = self._client(prompt, max_length=max_length, num_return_sequences=1)
            generated_content = response[0]['generated_text']
            logger.info("Content generated successfully")
            return generated_content
        except Exception as e:
            logger.error(f"Error generating content with Hugging Face model: {str(e)}")
            raise Exception(f"Content generation failed: {str(e)}")

hugging_face_llm_client = HuggingFaceLLMClient()
