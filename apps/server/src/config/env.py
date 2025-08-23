import os
from dotenv import load_dotenv

load_dotenv()

env = {
    "HOST": os.getenv("HOST", "127.0.0.1"),
    "PORT": os.getenv("PORT", "8000"),
    "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
    "DB_URL": os.getenv("DB_URL", "sqlite://db.sqlite3"),
    "SECRET_KEY": os.getenv("SECRET_KEY", "your-secret-key"),
    "KEY_VAULT_URL": os.getenv("KEY_VAULT_URL", ""),
    # Azure OpenAI Configuration
    "AZURE_OPENAI_API_KEY": os.getenv("AZURE_OPENAI_API_KEY"),
    "AZURE_OPENAI_ENDPOINT": os.getenv("AZURE_OPENAI_ENDPOINT"),
    "AZURE_OPENAI_API_VERSION": os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01"),
    "AZURE_OPENAI_DEPLOYMENT": os.getenv("AZURE_OPENAI_DEPLOYMENT"),
    # Hugging Face Configuration
    "HUGGING_FACE_API_KEY": os.getenv("HUGGING_FACE_API_KEY"),
    "HUGGING_FACE_MODEL": os.getenv("HUGGING_FACE_MODEL", "gpt-2"),  # Default model
    # Ollama Configuration (fallback)
    "OLLAMA_BASE_URL": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
    "OLLAMA_MODEL": os.getenv("OLLAMA_MODEL", "llama3.2:1b"),
}
