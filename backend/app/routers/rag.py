from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pathlib import Path
import os

from ..utils.seguridad import verificar_admin
from ..models.usuario import Usuario

from ..services.rag import search, compose_context, ensure_loaded, build_index
from ..services.doc_ingest import collect_chunks
from ..services.ai import ask_openai


router = APIRouter(prefix="/rag", tags=["RAG"])

# directorio donde se guardan los documentos subidos
DOCS_DIR = Path(__file__).resolve().parents[2] / "docs"

@router.get("/status")
def rag_status():
    return {"loaded": ensure_loaded()}


@router.get("/search")
def rag_search(q: str, k: int = 4):
    hits = search(q, top_k=k)
    context = compose_context(hits)
    # si hay contexto, que OpenAI genere respuesta resumida
    if context.strip():
        answer = ask_openai([{"role": "user", "content": q}], context=context)
        return {"query": q, "hits": hits, "context": context, "answer": answer}
    return {"query": q, "hits": hits, "context": "", "answer": "No se encontró información relevante."}

@router.post("/upload")
@router.post("/upload/")
def rag_upload(
    file: UploadFile = File(...),
    _: Usuario = Depends(verificar_admin),
):
    # Validar extensión
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in {".pdf", ".txt", ".md"}:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usa PDF, TXT o MD.")

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    dest = DOCS_DIR / file.filename
    try:
        with open(dest, "wb") as f:
            f.write(file.file.read())
    finally:
        file.file.close()

    # Nota: No reindexamos automáticamente aquí para no colgar la UI.
    return {"guardado": True, "filename": file.filename, "path": str(dest)}

@router.post("/reindex")
@router.post("/reindex/")
def rag_reindex(_: Usuario = Depends(verificar_admin)):
    # Reconstruir el índice leyendo TODO lo que haya en backend/docs
    chunks = collect_chunks(DOCS_DIR)
    if not chunks:
        raise HTTPException(status_code=400, detail="No hay documentos en backend/docs para indexar.")
    try:
        build_index(chunks)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "chunks": len(chunks)}
