from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.usuario import Usuario
from ..models.token_recuperacion import TokenRecuperacion
import secrets
from datetime import datetime

router = APIRouter()

@router.post("/recuperar")
def solicitar_token(correo: str, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    token = secrets.token_urlsafe(32)
    nuevo_token = TokenRecuperacion(token=token, usuario_id=usuario.id)
    db.add(nuevo_token)
    db.commit()
    return {"token": token}

@router.post("/reset-password")
def cambiar_contraseña(token: str, nueva: str, db: Session = Depends(get_db)):
    registro = db.query(TokenRecuperacion).filter(TokenRecuperacion.token == token).first()
    if not registro or registro.expiracion < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    usuario = db.query(Usuario).filter(Usuario.id == registro.usuario_id).first()
    usuario.hashed_password = hash_password(nueva)
    db.delete(registro)
    db.commit()
    return {"mensaje": "Contraseña actualizada"}