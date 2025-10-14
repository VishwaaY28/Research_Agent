import logging
from openai import AzureOpenAI, OpenAI
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from typing import List, Dict, Any, Optional
import tiktoken
from config.env import env

logger = logging.getLogger(__name__)

def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """Count tokens in text using tiktoken"""
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception as e:
        logger.warning(f"Failed to count tokens with tiktoken: {e}")
        # Fallback: rough estimation (1 token ≈ 4 characters)
        return len(text) // 4

class AzureOpenAIClient:
    def __init__(self):
        # prefer KEY_VAULT_URL from environment; keep hard-coded default for backward compatibility
        self.key_vault_url = env.get("KEY_VAULT_URL") or "https://KV-fs-to-autogen.vault.azure.net/"
        self._config = None
        self._client = None

    def _load_config_from_vault(self):
        """Load configuration from Azure Key Vault"""
        if self._config is None:
            # If KEY_VAULT_URL is not configured, skip Key Vault entirely and use environment variables
            kv_url = env.get("KEY_VAULT_URL") or self.key_vault_url
            if not kv_url:
                logger.info("No Key Vault URL configured; using environment variables for Azure OpenAI config")
                self._config = {
                    "api_key": env.get("AZURE_OPENAI_API_KEY"),
                    "api_base": env.get("AZURE_OPENAI_ENDPOINT"),
                    "model_version": env.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
                    "deployment": env.get("AZURE_OPENAI_DEPLOYMENT"),
                }
            else:
                try:
                    credential = DefaultAzureCredential()
                    client = SecretClient(vault_url=kv_url, credential=credential)

                    # Try to read each secret individually, but don't fail the whole flow if one is missing
                    cfg = {}
                    try:
                        cfg["api_key"] = client.get_secret("AzureLLMKey").value
                    except Exception:
                        logger.warning("AzureLLMKey not found in Key Vault or access denied; will try environment variable AZURE_OPENAI_API_KEY")
                        cfg["api_key"] = None

                    try:
                        cfg["api_base"] = client.get_secret("AzureOpenAiBase").value
                    except Exception:
                        logger.warning("AzureOpenAiBase not found in Key Vault or access denied; will try environment variable AZURE_OPENAI_ENDPOINT")
                        cfg["api_base"] = None

                    try:
                        cfg["model_version"] = client.get_secret("AzureOpenAiVersion").value
                    except Exception:
                        logger.warning("AzureOpenAiVersion not found in Key Vault or access denied; will try environment variable AZURE_OPENAI_API_VERSION")
                        cfg["model_version"] = None

                    try:
                        cfg["deployment"] = client.get_secret("AzureOpenAiDeployment").value
                    except Exception:
                        logger.warning("AzureOpenAiDeployment not found in Key Vault or access denied; will try environment variable AZURE_OPENAI_DEPLOYMENT")
                        cfg["deployment"] = None

                    # Fill any missing values from environment variables
                    cfg["api_key"] = cfg.get("api_key") or env.get("AZURE_OPENAI_API_KEY")
                    cfg["api_base"] = cfg.get("api_base") or env.get("AZURE_OPENAI_ENDPOINT")
                    cfg["model_version"] = cfg.get("model_version") or env.get("AZURE_OPENAI_API_VERSION", "2024-02-01")
                    cfg["deployment"] = cfg.get("deployment") or env.get("AZURE_OPENAI_DEPLOYMENT")

                    self._config = cfg

                    if self._config.get("api_base"):
                        logger.info(f"Loaded Azure OpenAI config - Base: {self._config['api_base']}")
                    if self._config.get("model_version"):
                        logger.info(f"Model version: {self._config['model_version']}")
                    if self._config.get("deployment"):
                        logger.info(f"Deployment: {self._config['deployment']}")
                    if self._config.get("api_key"):
                        logger.info(f"API Key starts with: {self._config['api_key'][:5]}...")

                except Exception as e:
                    logger.warning(f"Failed to access Azure Key Vault at {kv_url}: {str(e)}; falling back to environment variables")
                    self._config = {
                        "api_key": env.get("AZURE_OPENAI_API_KEY"),
                        "api_base": env.get("AZURE_OPENAI_ENDPOINT"),
                        "model_version": env.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
                        "deployment": env.get("AZURE_OPENAI_DEPLOYMENT"),
                    }

        return self._config

    def _get_client(self):
        """Get or create Azure OpenAI client"""
        if self._client is None:
            config = self._load_config_from_vault()

            missing = [k for k in ("api_key", "api_base", "deployment") if not config.get(k)]
            if missing:
                # Provide detailed guidance to help operators fix environment
                raise ValueError(
                    "Missing required Azure OpenAI configuration: {}. "
                    "Provide these via environment variables (AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT) "
                    "or configure them in Azure Key Vault and set KEY_VAULT_URL.".format(
                        ", ".join(missing)
                    )
                )

            self._client = AzureOpenAI(
                azure_endpoint=config["api_base"],
                api_key=config["api_key"],
                api_version=config["model_version"],
            )

        return self._client

    async def generate_content(
        self,
        prompt: str,
        context_sections: List[str] = None,
        context_images: List[Dict[str, Any]] = None,
        context_tables: List[Dict[str, Any]] = None,
        section_name: str = "Generated Content"
    ) -> Dict[str, Any]:
        """
        Generate proposal content based on prompt and context using Azure OpenAI
        """
        try:
            config = self._load_config_from_vault()
            client = self._get_client()

            workspace_content = ""

            if context_sections:
                workspace_content += "\n=== CONTENT SECTIONS ===\n"
                for i, section in enumerate(context_sections, 1):
                    workspace_content += f"\n{i}. {section}\n"

            if context_images:
                workspace_content += "\n=== IMAGES ===\n"
                for i, image in enumerate(context_images, 1):
                    workspace_content += f"\n{i}. Image: {image.get('caption', 'No caption')}"
                    if image.get('ocr_text'):
                        workspace_content += f"\n   OCR Text: {image['ocr_text']}"
                    workspace_content += "\n"

            if context_tables:
                workspace_content += "\n=== TABLES ===\n"
                for i, table in enumerate(context_tables, 1):
                    workspace_content += f"\n{i}. Table: {table.get('caption', 'No caption')}"
                    if table.get('data'):
                        workspace_content += f"\n   Data: {table['data']}"
                    workspace_content += "\n"

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

            user_message = f"Please generate the section content for '{section_name}' using the following user prompt as additional guidance: {prompt}"

            response = client.chat.completions.create(
                model=config["deployment"],
                temperature=0.2,
                max_tokens=600,
                top_p=0.9,
                frequency_penalty=0.8,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
            )

            generated_content = response.choices[0].message.content.strip()

            # Calculate token counts
            full_context = system_prompt + "\n" + user_message
            context_tokens = count_tokens(workspace_content)
            response_tokens = count_tokens(generated_content)

            logger.info(f"Successfully generated content for section: {section_name}")
            logger.info(f"Context tokens: {context_tokens}, Response tokens: {response_tokens}")

            return {
                "content": generated_content,
                "context_tokens": context_tokens,
                "response_tokens": response_tokens
            }

        except Exception as e:
            logger.error(f"Error generating content with Azure OpenAI: {str(e)}")
            raise Exception(f"Content generation failed: {str(e)}")


class OllamaClient:
    def __init__(self):
        self._config = None
        self._client = None

    def _load_config(self):
        """Load Ollama configuration"""
        if self._config is None:
            self._config = {
                "base_url": env.get("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
                "api_key": "ollama",
                "model": env.get("OLLAMA_MODEL", "llama3.2:1b"),
            }

            logger.info(f"Loaded Ollama config - Base URL: {self._config['base_url']}")
            logger.info(f"Model: {self._config['model']}")

        return self._config

    def _get_client(self):
        """Get or create Ollama client"""
        if self._client is None:
            config = self._load_config()

            self._client = OpenAI(
                base_url=config["base_url"],
                api_key=config["api_key"],
            )

        return self._client

    async def generate_content(
        self,
        prompt: str,
        context_sections: List[str] = None,
        context_images: List[Dict[str, Any]] = None,
        context_tables: List[Dict[str, Any]] = None,
        section_name: str = "Generated Content"
    ) -> Dict[str, Any]:
        """
        Generate proposal content based on prompt and context using Ollama
        """
        try:
            config = self._load_config()
            client = self._get_client()

            workspace_content = ""

            if context_sections:
                workspace_content += "\n=== CONTENT SECTIONS ===\n"
                for i, section in enumerate(context_sections, 1):
                    workspace_content += f"\n{i}. {section}\n"

            if context_images:
                workspace_content += "\n=== IMAGES ===\n"
                for i, image in enumerate(context_images, 1):
                    workspace_content += f"\n{i}. Image: {image.get('caption', 'No caption')}"
                    if image.get('ocr_text'):
                        workspace_content += f"\n   OCR Text: {image['ocr_text']}"
                    workspace_content += "\n"

            if context_tables:
                workspace_content += "\n=== TABLES ===\n"
                for i, table in enumerate(context_tables, 1):
                    workspace_content += f"\n{i}. Table: {table.get('caption', 'No caption')}"
                    if table.get('data'):
                        workspace_content += f"\n   Data: {table['data']}"
                    workspace_content += "\n"

            system_prompt = f"""
You are a professional proposal writer for a reputed IT Services enterprise.
You will help draft a specific section of a business proposal based strictly on the content provided below from a Workspace.

Your response must follow these principles:
- Use only the information provided in the Workspace. Do not assume or invent additional content.
- Maintain an enterprise-grade, business-professional tone.
- Ensure that the writing reflects the company's credibility, experience, and strategic value.
- Use clear, confident, and well-structured language suitable for external stakeholders such as clients, procurement teams, and decision-makers.

Output requirements (IMPORTANT):
- Format the response using well-structured.
- Include explicit sections with headings.
- Use bullet lists where appropriate for clarity.
- Use bold and/or italics to highlight important terms or recommendations.
- Leave blank line between paragraphs and list blocks for readability.
- Keep the output concise (aim for 3-8 short paragraphs or 6-12 bullet points) and suitable for direct copy-paste into a proposal document.

---
### Section to be Written:
{section_name}

### Workspace Content:
\"\"\"
{workspace_content}
\"\"\"

---
Instructions:
- Synthesize and summarize the workspace content into a coherent, well-written section.
- If the content spans multiple ideas, organize them into logical paragraphs or bullet points as appropriate.
- Do not repeat raw content or include citations/attributions. The output should be ready to copy-paste into a client-facing proposal.
"""

            user_message = f"Please generate the section content for '{section_name}' using the following user prompt as additional guidance: {prompt}"

            response = client.chat.completions.create(
                model=config["model"],
                temperature=0.3,
                max_tokens=1200,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
            )

            generated_content = response.choices[0].message.content.strip()

            # Calculate token counts
            full_context = system_prompt + "\n" + user_message
            context_tokens = count_tokens(workspace_content)
            response_tokens = count_tokens(generated_content)

            logger.info(f"Successfully generated content using Ollama for section: {section_name}")
            logger.info(f"Context tokens: {context_tokens}, Response tokens: {response_tokens}")

            return {
                "content": generated_content,
                "context_tokens": context_tokens,
                "response_tokens": response_tokens
            }

        except Exception as e:
            logger.error(f"Error generating content with Ollama: {str(e)}")
            raise Exception(f"Content generation failed: {str(e)}")


azure_openai_client = AzureOpenAIClient()
ollama_client = OllamaClient()

openai_client = azure_openai_client
