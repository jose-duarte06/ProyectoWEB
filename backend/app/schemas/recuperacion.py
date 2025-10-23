from pydantic import BaseModel, EmailStr

class RecuperarIn(BaseModel):
    correo: EmailStr

class ResetIn(BaseModel):
    token: str
    nueva: str
