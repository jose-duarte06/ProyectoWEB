from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal

class DetalleCrear(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: float

class PedidoCrear(BaseModel):
    detalles: list[DetalleCrear]
    total: float

class DetalleRespuesta(DetalleCrear):
    id: int

    class Config:
        from_attributes = True

class PedidoRespuesta(BaseModel):
    id: int
    usuario_id: int
    fecha: datetime
    total: float
    estado: str
    detalles: list[DetalleRespuesta]

    class Config:
        from_attributes = True

EstadoType = Literal["abierto", "procesando","enviando", "entregado", "cancelado"]

class EstadoPedidoIn(BaseModel):
    estado: EstadoType = Field(..., description="Nuevo estadodel pedido")

