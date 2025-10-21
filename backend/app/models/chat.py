from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estado = Column(String(20), nullable=False, default="abierto")  # abierto|cerrado
    creado_en = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario")
    mensajes = relationship("ChatMessage", back_populates="sesion", cascade="all, delete-orphan")
