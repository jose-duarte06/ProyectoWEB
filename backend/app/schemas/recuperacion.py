
from pydantic import BaseModel, EmailStr, Field

class SolicitarRecuperacionIn(BaseModel):
    correo: EmailStr

class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=10)   # validación mínima
    nueva: str = Field(min_length=8)    #  al menos 8 chars
