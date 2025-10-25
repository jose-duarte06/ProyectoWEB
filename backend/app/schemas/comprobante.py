from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ComprobanteOut(BaseModel):
    id: int
    pedido_id: int
    usuario_id: int
    url: str
    archivo: str
    monto: Optional[float] = None
    metodo: Optional[str] = None
    referencia: Optional[str] = None
    estado: str
    nota: Optional[str] = None
    subido_en: datetime

    class Config:
        orm_mode = True