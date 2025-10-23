from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pathlib import Path
import os

from ..utils.seguridad import verificar_admin
from ..models.usuario import Usuario

from ..services.rag import search, compose_context, ensure_loaded, build_index
from ..services.doc_ingest import collect_chunks
from ..services.ai import ask_openai


router = APIRouter(prefix="/rag", tags=["RAG"])

#configuracion y directorio de docimentos
DOCS_DIR = Path(__file__).resolve().parents[2] / "docs"
MAX_UPLOAD_MB = 8
ALLOWED_EXTS = {".pdf", ".txt", ".md"}
ALLOWED_MIMES = {
    "application/pdf", "text/plain", "text/markdown",
    "application/octet-stream",
}

@router.get("/status")
def rag_status():
    return {"loaded": ensure_loaded()}


@router.get("/search")
def rag_search(q: str, k: int = 4):
    """
    Devuelve hits + respuesta resumida generada por el modelo a partir del contexto.
    """
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
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usa PDF, TXT o MD.")

# Validar tamaño (si el navegador envía Content-Length)
    cl = int(file.headers.get("content-length", "0") or 0)
    if cl and cl > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Archivo mayor a {MAX_UPLOAD_MB}MB.")

    # Validar MIME (mejor esfuerzo)
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido.")

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    dest = DOCS_DIR / file.filename
    try:
        with open(dest, "wb") as f:
            f.write(file.file.read())
    finally:
        file.file.close()

    # Nota: No reindexamos automáticamente aquí para no colgar la UI.
    return {"guardado": True, "filename": file.filename, "path": str(dest)}

#Reindexar
@router.post("/reindex")
@router.post("/reindex/")
def rag_reindex(_: Usuario = Depends(verificar_admin)):
    """
    Reconstruir el índice leyendo TODO lo que haya en backend/docs.
    """
    chunks = collect_chunks(DOCS_DIR)
    if not chunks:
        raise HTTPException(status_code=400, detail="No hay documentos en backend/docs para indexar.")
    try:
        build_index(chunks)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "chunks": len(chunks)}

# CRUD de archivos (listar y eliminar) + reindex tras borrar
@router.get("/files")
def rag_list_files(_: Usuario = Depends(verificar_admin)):
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    files = [p.name for p in DOCS_DIR.glob("*") if p.is_file()]
    return {"files": files}

@router.delete("/files/{fname}")
def rag_delete_file(fname: str, _: Usuario = Depends(verificar_admin)):
    # Normalizar y evitar path traversal
    p = (DOCS_DIR / fname).resolve()
    if DOCS_DIR not in p.parents:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido.")
    if not p.exists():
        raise HTTPException(status_code=404, detail="El archivo no existe.")

    p.unlink()

    # Reindexar después del delete
    chunks = collect_chunks(DOCS_DIR)
    if chunks:
        build_index(chunks)

    return {"ok": True, "reindexed": len(chunks)}
