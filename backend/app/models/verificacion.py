from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from ..database import Base

class VerificacionCorreo(Base):
    __tablename__ = "verificaciones_correo"
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), index=True, nullable=False)
    codigo = Column(String, index=True, nullable=False)  # ej: 6 dígitos o token
    expiracion = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(minutes=15))
    usado = Column(Boolean, default=False)

    usuario = relationship("Usuario", back_populates="verificacion")
