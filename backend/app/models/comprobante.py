from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class ComprobantePago(Base):
    __tablename__ = "comprobantes_pago"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)

    archivo = Column(String(255), nullable=False)   # p.ej. "comprobantes/uuid.jpg"
    url     = Column(String(255), nullable=False)   # p.ej. "/media/comprobantes/uuid.jpg"

    monto = Column(Float, nullable=True)
    metodo = Column(String(30), nullable=True)
    referencia = Column(String(80), nullable=True)
    estado = Column(String(20), default="pendiente")   # pendiente | aprobado | rechazado
    nota = Column(Text, nullable=True)

    subido_en = Column(DateTime, default=datetime.utcnow)

    pedido = relationship("Pedido")
    usuario = relationship("Usuario")