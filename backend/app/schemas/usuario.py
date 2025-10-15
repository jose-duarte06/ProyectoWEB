from pydantic import BaseModel, EmailStr

class UsuarioCrear(BaseModel):
    nombre: str
    apellido: str
    correo: EmailStr
    contrasena: str

class UsuarioRespuesta(BaseModel):
    id: int
    nombre: str
    apellido: str
    correo: EmailStr
    rol: str

    class Config:
        from_attributes = True
        
class UsuarioLogin(BaseModel):
    correo: EmailStr
    contrasena: str