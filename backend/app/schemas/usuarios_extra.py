from pydantic import BaseModel, EmailStr

class VerificarIn(BaseModel):
    correo: EmailStr
    codigo: str

class ReenvioIn(BaseModel):
    correo: EmailStr
