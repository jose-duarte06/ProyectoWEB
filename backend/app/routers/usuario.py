from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.usuario import Usuario
from ..schemas.usuario import UsuarioCrear, UsuarioRespuesta, UsuarioLogin
from ..utils.seguridad import(
    hashear_contrasena, verificar_contrasena, crear_token_acceso,
    verificar_admin, obtener_usuario_actual,
) 
from ..utils.emailer import send_email
from datetime import datetime, timedelta
import secrets
from ..models.verificacion import VerificacionCorreo

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generar_codigo_6():
    #codigo de 6 digitos
    return f"{secrets.randbelow(1_000_000):06d}"

# Registro - enviar codigo -
@router.post("/registro", response_model=UsuarioRespuesta)
def registrar_usuario(
    datos: UsuarioCrear, 
    bg: BackgroundTasks, 
    db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.correo == datos.correo).first()
    if existe:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    usuario = Usuario(
        nombre=datos.nombre,
        apellido=datos.apellido,
        correo=datos.correo,
        contrasena_hash=hashear_contrasena(datos.contrasena),
        is_verificado=False
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    codigo=generar_codigo_6()
    registro= VerificacionCorreo(
        usuario_id=usuario.id,
        codigo=codigo,
        expiracion=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(registro); 
    db.commit()

    #enviar email en background
    html = f"""
    <h3> Verifica tu correo</h3>
    <p> Tu código de verificación para Moteka store es: <b>{codigo}</b></b>
    
    <p>Expira en 10 minutos.</p>
    """
    bg.add_task(send_email, usuario.correo, "verificación de correo", html)

    return usuario

# Verificar correo
@router.post("/verificar")
def verificar_correo(correo: str, codigo: str, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    if usuario.is_verificado:
        return {"mensaje": "El correo ya está verificado"}

    reg = db.query(VerificacionCorreo).filter(
        VerificacionCorreo.usuario_id == usuario.id,
        VerificacionCorreo.codigo == codigo,
        VerificacionCorreo.usado == False
    ).first()
    if not reg or reg.expiracion < datetime.utcnow():
        raise HTTPException(400, "Código inválido o expirado")

    usuario.is_verificado = True
    reg.usado = True
    db.commit()
    return {"mensaje": "Correo verificado"}

# Reenviar código
@router.post("/reenvio-verificacion")
def reenvio_verificacion(correo: str, bg: BackgroundTasks, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    if usuario.is_verificado:
        return {"mensaje": "El correo ya está verificado"}

    # invalidar anteriores
    db.query(VerificacionCorreo).filter(
        VerificacionCorreo.usuario_id == usuario.id, 
        VerificacionCorreo.usado==False
        ).update({"usado": True})
    db.commit()

    codigo = generar_codigo_6()
    registro = VerificacionCorreo(
        usuario_id=usuario.id,
        codigo=codigo,
        expiracion=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(registro); db.commit()

    html = f"""
    <h3>Verifica tu correo</h3>
    <p>Tu código de verificación es: <b>{codigo}</b></p>
    <p>Expira en 10 minutos.</p>
    """
    bg.add_task(send_email, usuario.correo, "Verificación de correo", html)
    return {"mensaje": "Código reenviado"}

# Login
@router.post("/login")
def iniciar_sesion(datos: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == datos.correo).first()
    if not usuario or not verificar_contrasena(datos.contrasena, usuario.contrasena_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    #verificacion antes de autorizar
    if not getattr(usuario, "is_verificado", False):
        raise HTTPException(status_code=403, detail="Verifica tu correo antes de iniciar sesión")

    token = crear_token_acceso({"sub": usuario.correo})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/", response_model=list[UsuarioRespuesta])
def listar_usuarios(db: Session = Depends(get_db), usuario: Usuario = Depends(verificar_admin)):
    return db.query(Usuario).all()

@router.get("/perfil", response_model=UsuarioRespuesta)
def ver_mi_perfil(usuario: Usuario = Depends(obtener_usuario_actual)):
    return usuario

