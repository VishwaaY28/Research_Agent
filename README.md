# Proposal Craft

Proposal Craft is a full‑stack proposal authoring tool that helps teams ingest content (PDFs and more), organize it into meaningful sections and tags, and generate high‑quality proposal sections with the help of LLMs.

It includes:
- FastAPI backend for content ingestion, parsing, tagging, and prompt/authoring workflows
- React + Vite frontend for workspaces, content management, and proposal authoring UI
- LLM integrations (Azure OpenAI primary, Ollama fallback) for assisted writing

## Tech Stack

- Frontend: React 19, Vite 7, TypeScript, Tailwind CSS, React Router, Zod
- Backend: FastAPI, Starlette, Uvicorn, Tortoise ORM (SQLite by default)
- Content/PDF Processing: unstructured, pdfplumber, pdfminer.six, NLTK, scikit‑learn, OpenCV, pytesseract
- LLMs:
  - Azure OpenAI (primary; Chat Completions)
  - Ollama (optional fallback; default `llama3.2:1b`)
- Auth/Config: Custom middleware, `.env` loaded via `python-dotenv`

## Project Structure

```
apps/
  client/           # React + Vite frontend
  server/
    src/
      main.py       # FastAPI app entrypoint
      api/          # Routers, handlers, middlewares
      utils/        # PDF extraction, LLM clients, helpers
      config/env.py # Environment config loader
apps/requirements.txt
README.md
```

## Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- Optional for best PDF extraction accuracy: system tools like Tesseract OCR and Poppler may be required by some libraries (pytesseract, pdf2image). Install as needed for your OS.

## Environment Variables

Create a `.env` file at `apps/server/src/.env` or project root (loaded by `config/env.py`). Common keys:

```
HOST=127.0.0.1
PORT=8000
LOG_LEVEL=INFO
DB_URL=sqlite://db.sqlite3
SECRET_KEY=replace-me

# Azure OpenAI (primary LLM)
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT=...   # deployment name

# Ollama (optional fallback LLM)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.2:1b
```

If you are using Azure Key Vault, the backend can load Azure OpenAI credentials from the vault (see `apps/server/src/utils/llm.py`).

For more details, see `AZURE_OPENAI_SETUP.md`.

## Install & Run

### 1) Backend (FastAPI)

```
# From project root
python -m venv .venv
. .venv/Scripts/activate   # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r apps/requirements.txt

# Run (option A):
python apps/server/src/main.py

# Run (option B) with uvicorn directly:
cd apps/server/src && uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000` and exposes `/api/*` routes.

### 2) Frontend (React + Vite)

```
cd apps/client
npm install
npm run dev
```

By default Vite serves on `http://localhost:5173`. Ensure CORS settings in `apps/server/src/main.py` allow your frontend origin (adjust `allow_origins`).

## Key Features

- PDF ingestion and robust sectioning:
  - TOC-aware major chunking; NLP‑based minor chunking
  - Cleanup of footers and noise; improved heading detection
  - Auto‑tagging with strict 3‑tag limit per chunk and controlled merging
- Workspaces to organize extracted content, prompts, and generated sections
- Prompt templates and guided section authoring
- LLM‑assisted drafting via Azure OpenAI, with Ollama fallback

## LLM Usage

- Primary: Azure OpenAI via Chat Completions (deployment configured by `AZURE_OPENAI_DEPLOYMENT`)
- Fallback: Ollama (local) using OpenAI‑compatible API (`OLLAMA_BASE_URL`, default model `OLLAMA_MODEL`)
- Token accounting via `tiktoken`

Relevant code:
- `apps/server/src/utils/llm.py` (AzureOpenAIClient, OllamaClient)
- `apps/server/src/api/handlers/prompts.py` (prompt workflows)

## Notes on PDF Extraction

The extraction pipeline uses `unstructured`, `nltk`, and other libraries. Some features (tables/OCR) may require system dependencies. If you encounter issues parsing PDFs, ensure Tesseract and Poppler are installed and on PATH.

## Scripts

Frontend:
```
npm run dev      # start dev server
npm run build    # typecheck + build
npm run preview  # preview production build
npm run lint     # lint
npm run format   # format with Prettier
```

Backend:
- Start with `python apps/server/src/main.py` or `uvicorn main:app` from `apps/server/src`.

## License

Proprietary. All rights reserved.

