# Azure OpenAI Configuration Setup

## Issue
The application is showing the error: "Missing required Azure OpenAI configuration"

## Solution

### 1. Create Environment Variables File
Create a `.env` file in the `apps/server/` directory with the following content:

```env
# Server Configuration
HOST=127.0.0.1
PORT=8000
LOG_LEVEL=INFO
DB_URL=sqlite://db.sqlite3
SECRET_KEY=your-secret-key-here

# Azure OpenAI Configuration
# Get these values from your Azure OpenAI resource in the Azure portal
AZURE_OPENAI_API_KEY=your-azure-openai-api-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT=your-deployment-name

# Ollama Configuration (fallback option)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2:1b
```

### 2. Get Azure OpenAI Credentials

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to your Azure OpenAI resource
3. Go to "Keys and Endpoint" section
4. Copy the following values:
   - **API Key**: Use Key 1 or Key 2
   - **Endpoint**: The base URL (e.g., `https://your-resource.openai.azure.com/`)
   - **Deployment Name**: The name of your model deployment

### 3. Update the .env file
Replace the placeholder values in your `.env` file with your actual Azure OpenAI credentials:

```env
AZURE_OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
```

### 4. Alternative: Use Azure Key Vault
If you prefer to use Azure Key Vault for secure storage:

1. Set up an Azure Key Vault
2. Store your secrets with these names:
   - `AzureLLMKey` (your API key)
   - `AzureOpenAiBase` (your endpoint)
   - `AzureOpenAiVersion` (API version)
   - `AzureOpenAiDeployment` (deployment name)
3. Update the `KEY_VAULT_URL` in your `.env` file

### 5. Restart the Server
After updating the configuration, restart your server:

```bash
cd apps/server
uvicorn src.main:app --reload
```

## Troubleshooting

### If you don't have Azure OpenAI access:
You can use Ollama as a fallback by setting the environment variable:

```bash
# On Windows
set USE_AZURE_OPENAI=false

# On Linux/Mac
export USE_AZURE_OPENAI=false
```

Or modify the `apps/server/src/api/handlers/prompts.py` file and change:
```python
USE_AZURE_OPENAI = False
```

### Check if environment variables are loaded:
Add this to your server startup to debug:

```python
import os
print("AZURE_OPENAI_API_KEY:", os.getenv("AZURE_OPENAI_API_KEY"))
print("AZURE_OPENAI_ENDPOINT:", os.getenv("AZURE_OPENAI_ENDPOINT"))
print("AZURE_OPENAI_DEPLOYMENT:", os.getenv("AZURE_OPENAI_DEPLOYMENT"))
```

## Note
The configuration has been updated in `apps/server/src/config/env.py` to include all required Azure OpenAI environment variables. Make sure to restart your server after making any changes to the environment variables. 