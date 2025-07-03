import os
from fastapi import HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from database.repositories.sources import content_source_repository
from database.repositories.workspaces import workspace_repository
from utils.extract_pdf import extract_pdf_text
from utils.extract_docx import extract_docx_text
from utils.extract_web import extract_web_text

SOURCES_DIR = "sources"
EXTRACTS_DIR = "extracts"
os.makedirs(SOURCES_DIR, exist_ok=True)
os.makedirs(EXTRACTS_DIR, exist_ok=True)

async def upload_and_extract(workspace_id: int, file: UploadFile = File(None), url: str = Form(None)):
    workspace = await workspace_repository.fetch_by_id(workspace_id)
    if not workspace:
      raise HTTPException(status_code=404, detail="Workspace not found.")

    if file:
        filename = file.filename
        ext = filename.split(".")[-1].lower()
        source_path = os.path.join(SOURCES_DIR, filename)
        with open(source_path, "wb") as f:
            f.write(await file.read())
        if ext == "pdf":
            text = extract_pdf_text(source_path)
            source_type = "pdf"
        elif ext == "docx":
            text = extract_docx_text(source_path)
            source_type = "docx"
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")
        source_url = source_path
    else:
        filename = url.replace("://", "_").replace("/", "_")
        source_path = os.path.join(SOURCES_DIR, filename + ".txt")
        text = extract_web_text(url)
        source_type = "web"
        with open(source_path, "w") as f:
            f.write(text)
        source_url = url

    extract_path = os.path.join(EXTRACTS_DIR, filename + ".txt")
    with open(extract_path, "w") as f:
        f.write(text)

    content_source = await content_source_repository.upsert(
        workspace_id=workspace_id,
        name=filename,
        source_url=source_url,
        extracted_url=extract_path,
        type=source_type,
    )
    return JSONResponse({"success": True, "content_source_id": content_source.id})

async def get_content_sources(workspace_id: int):
    sources = await content_source_repository.fetch_by_workspace(workspace_id)
    return JSONResponse([{
        "id": s.id,
        "name": s.name,
        "type": s.type.value if s.type else None,
        "source_url": s.source_url,
        "extracted_url": s.extracted_url
    } for s in sources])

async def filter_content_sources(workspace_id: int, filename: str):
    sources = await content_source_repository.filter_by_filename(workspace_id, filename)
    return JSONResponse([{
        "id": s.id,
        "name": s.name,
        "type": s.type.value if s.type else None,
        "source_url": s.source_url,
        "extracted_url": s.extracted_url
    } for s in sources])

async def soft_delete_content_source(content_source_id: int):
    await content_source_repository.soft_delete(content_source_id)
    return JSONResponse({"success": True})

async def hard_delete_content_source(content_source_id: int):
    await content_source_repository.hard_delete(content_source_id)
    return JSONResponse({"success": True})
