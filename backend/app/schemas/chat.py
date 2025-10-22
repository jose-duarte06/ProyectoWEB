from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, List

Role = Literal["user", "assistant", "system"]

class ChatMessageIn(BaseModel):
    content: str #Field(..., min_length=1, max_length=4000)

class ChatMessageOut(BaseModel):
    id: int
    role: Role
    content: str
    creado_en: datetime
    class Config:
        from_attributes = True

class ChatSessionOut(BaseModel):
    id: int
    usuario_id: int
    estado: str
    creado_en: datetime
    mensajes: List[ChatMessageOut]
    class Config:
        from_attributes = True

class ChatSessionListItem(BaseModel):
    id: int
    usuario_id: int
    estado: str
    creado_en: datetime
    class Config:
        from_attributes = True
