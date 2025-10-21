from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from ..models.usuario import Usuario
from ..database import SessionLocal
from ..config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/usuarios/login")

pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")


def verificar_contrasena(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hashear_contrasena(password):
    return pwd_context.hash(password)

def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def obtener_usuario_actual(token: str = Depends(oauth2_scheme)):
    credenciales_invalidas = HTTPException(
        status_code=401,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        correo: str = payload.get("sub")
        if correo is None:
            raise credenciales_invalidas
    except JWTError:
        raise credenciales_invalidas

    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
    db.close()
    if usuario is None:
        raise credenciales_invalidas
    return usuario

def verificar_admin(usuario: Usuario = Depends(obtener_usuario_actual)):
    if usuario.rol != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return usuario

