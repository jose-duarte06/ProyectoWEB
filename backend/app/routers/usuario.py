from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.usuario import Usuario
from ..schemas.usuario import UsuarioCrear, UsuarioRespuesta, UsuarioLogin
from ..utils.seguridad import hashear_contrasena, verificar_contrasena, crear_token_acceso, verificar_admin, obtener_usuario_actual

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Registro
@router.post("/registro", response_model=UsuarioRespuesta)
def registrar_usuario(datos: UsuarioCrear, db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.correo == datos.correo).first()
    if existe:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    usuario = Usuario(
        nombre=datos.nombre,
        apellido=datos.apellido,
        correo=datos.correo,
        contrasena_hash=hashear_contrasena(datos.contrasena)
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario

# Login
@router.post("/login")
def iniciar_sesion(datos: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == datos.correo).first()
    if not usuario or not verificar_contrasena(datos.contrasena, usuario.contrasena_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = crear_token_acceso({"sub": usuario.correo})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/", response_model=list[UsuarioRespuesta])
def listar_usuarios(db: Session = Depends(get_db), usuario: Usuario = Depends(verificar_admin)):
    return db.query(Usuario).all()

@router.get("/perfil", response_model=UsuarioRespuesta)
def ver_mi_perfil(usuario: Usuario = Depends(obtener_usuario_actual)):
    return usuario
