import os, uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.pedido import Pedido
from ..models.usuario import Usuario
from ..utils.seguridad import obtener_usuario_actual

# Modelo (usa el tuyo). Si estuviera en "modelos", el fallback lo cubre.
try:
    from ..models.comprobante import ComprobantePago
except Exception:
    from ..modelos.comprobante import ComprobantePago  # fallback si tu carpeta se llama "modelos"

router = APIRouter(prefix="/pagos", tags=["Pagos"])

# Guardamos bajo /media/comprobantes (coincide con app.mount("/media", ...))
MEDIA_ROOT = os.path.abspath(os.getenv("MEDIA_ROOT", "media"))
UPLOAD_DIR = os.path.join(MEDIA_ROOT, "comprobantes")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


ALLOWED_MIMES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}


def _can_access(db: Session, pedido_id: int, user: Usuario) -> Pedido:
    ped = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not ped:
        raise HTTPException(404, "Pedido no encontrado")
    if user.rol != "administrador" and ped.usuario_id != user.id:
        raise HTTPException(403, "No autorizado para este pedido")
    return ped


@router.post("/comprobantes")
async def subir_comprobante(
    request: Request,
    pedido_id: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: Usuario = Depends(obtener_usuario_actual),
):
    _can_access(db, pedido_id, user)

    mime = (archivo.content_type or "").lower()
    if mime not in ALLOWED_MIMES:
        raise HTTPException(415, "Tipo de archivo no soportado. Sube PDF o imagen (png/jpg/webp).")

    # extensión por MIME (o por nombre original)
    ext_map = {
        "application/pdf": ".pdf",
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
    }
    ext = ext_map.get(mime) or os.path.splitext(archivo.filename or "")[1] or ""
    fname = f"{uuid.uuid4().hex}{ext}"
    disk_path = os.path.join(UPLOAD_DIR, fname)

    # guardar por chunks
    with open(disk_path, "wb") as out:
        while True:
            chunk = await archivo.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)

    # ruta relativa y URL pública bajo /media
    rel_path = f"comprobantes/{fname}"
    base = str(request.base_url).rstrip("/")
    url = f"{base}/media/{rel_path}"

    rec = ComprobantePago(
        pedido_id=pedido_id,
        usuario_id=user.id,
        archivo=rel_path,   # <— corresponde a tu modelo
        url=url,            # <— corresponde a tu modelo
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    ts = getattr(rec, "subido_en", None) or getattr(rec, "creado_en", None)
    return {
        "id": rec.id,
        "pedido_id": rec.pedido_id,
        "usuario_id": rec.usuario_id,
        "url": rec.url,
        "subido_en": ts.isoformat() if ts else None,
    }


@router.get("/pedido/{pedido_id}")
def comprobantes_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(obtener_usuario_actual),
):
    _can_access(db, pedido_id, user)
    recs: List[ComprobantePago] = (
        db.query(ComprobantePago)
        .filter(ComprobantePago.pedido_id == pedido_id)
        .order_by(ComprobantePago.id.desc())
        .all()
    )
    out = []
    for r in recs:
        ts = getattr(r, "subido_en", None) or getattr(r, "creado_en", None)
        out.append({
            "id": r.id, "pedido_id": r.pedido_id, "usuario_id": r.usuario_id,
            "url": r.url, "subido_en": ts.isoformat() if ts else None,
        })
    return out


@router.get("/mis-comprobantes")
def mis_comprobantes(
    db: Session = Depends(get_db),
    user: Usuario = Depends(obtener_usuario_actual),
):
    recs: List[ComprobantePago] = (
        db.query(ComprobantePago)
        .filter(ComprobantePago.usuario_id == user.id)
        .order_by(ComprobantePago.id.desc())
        .all()
    )
    out = []
    for r in recs:
        ts = getattr(r, "subido_en", None) or getattr(r, "creado_en", None)
        out.append({
            "id": r.id, "pedido_id": r.pedido_id, "usuario_id": r.usuario_id,
            "url": r.url, "subido_en": ts.isoformat() if ts else None,
        })
    return out