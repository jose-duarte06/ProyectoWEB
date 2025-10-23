from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.usuario import Usuario
from ..models.token_recuperacion import TokenRecuperacion
from ..utils.seguridad import hashear_contrasena
from ..utils.emailer import send_email
import secrets
from datetime import datetime, timedelta
from ..schemas.recuperacion import RecuperarIn, ResetIn

router = APIRouter(prefix="/recuperacion", tags=["Recuperación"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/recuperar")
def solicitar_token(payload: RecuperarIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    correo = payload.correo
    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
    if not usuario or not usuario.is_verificado:
        return {"mensaje": "Si el correo está registrado, recibirás un token."}

    prev = db.query(TokenRecuperacion).filter(TokenRecuperacion.usuario_id == usuario.id).first()
    if prev:
        db.delete(prev); db.commit()

    token = secrets.token_urlsafe(32)
    nuevo = TokenRecuperacion(
        token=token,
        usuario_id=usuario.id,
        expiracion=datetime.utcnow() + timedelta(minutes=15)
    )
    db.add(nuevo); db.commit()

    html = f"""
    <h3>Recuperación de contraseña</h3>
    <p>Usa este token para restablecer tu contraseña:</p>
    <p><b>{token}</b></p>
    <p>Expira en 15 minutos.</p>
    """
    bg.add_task(send_email, usuario.correo, "Recuperación de contraseña", html)
    return {"mensaje": "Se envió un token de recuperación al correo"}

@router.post("/reset-password")
def reset_password(payload: ResetIn, db: Session = Depends(get_db)):
    token = payload.token
    nueva = payload.nueva

    reg = db.query(TokenRecuperacion).filter(TokenRecuperacion.token == token).first()
    if not reg or reg.expiracion < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    usuario = db.query(Usuario).filter(Usuario.id == reg.usuario_id).first()
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")

    usuario.contrasena_hash = hashear_contrasena(nueva)
    db.delete(reg)
    db.commit()
    return {"mensaje": "Contraseña actualizada"}