from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from ..database import Base

class TokenRecuperacion(Base):
    __tablename__ = "tokens_recuperacion"
    id = Column(Integer, primary_key=True)
    token = Column(String, unique=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    expiracion = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(minutes=15))

    usuario = relationship("Usuario", back_populates="token_recuperacion")