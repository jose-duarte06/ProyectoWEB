from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import SessionLocal
from ..models.chat import ChatSession
from ..models.mensaje import ChatMessage
from ..models.usuario import Usuario
from ..schemas.chat import ChatSessionOut, ChatSessionListItem, ChatMessageOut
from ..utils.seguridad import obtener_usuario_actual, verificar_admin

router = APIRouter(prefix="/chat", tags=["Chat"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/mis-sesiones", response_model=list[ChatSessionListItem])
def mis_sesiones(db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    return db.query(ChatSession).filter(ChatSession.usuario_id == usuario.id).order_by(ChatSession.id.desc()).all()

@router.get("/sesion/{sesion_id}", response_model=ChatSessionOut)
def sesion_detalle(
    sesion_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    s = (
        db.query(ChatSession)
        .options(joinedload(ChatSession.mensajes))
        .filter(ChatSession.id == sesion_id, ChatSession.usuario_id == usuario.id)
        .first()
    )
    if not s:
        raise HTTPException(404, "Sesión no encontrada")
    return s

# Admin: ver todas
@router.get("/admin/sesiones", response_model=list[ChatSessionListItem])
def admin_sesiones(_: Usuario = Depends(verificar_admin), db: Session = Depends(get_db)):
    return db.query(ChatSession).order_by(ChatSession.id.desc()).all()

@router.get("/admin/sesion/{sesion_id}", response_model=ChatSessionOut)
def admin_sesion_detalle(
    sesion_id: int,
    _: Usuario = Depends(verificar_admin),
    db: Session = Depends(get_db),
):
    s = (
        db.query(ChatSession)
        .options(joinedload(ChatSession.mensajes))
        .filter(ChatSession.id == sesion_id)
        .first()
    )
    if not s:
        raise HTTPException(404, "Sesión no encontrada")
    return s
