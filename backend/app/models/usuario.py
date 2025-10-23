from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..database import Base
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True, nullable=False)
    contrasena_hash = Column(String, nullable=False)
    rol = Column(String, default="cliente")

    #verificacion
    is_verificado = Column(Boolean, default=False)

    pedidos = relationship("Pedido", back_populates="usuario")
    token_recuperacion = relationship("TokenRecuperacion", uselist=False, back_populates="usuario")

    verificacion = relationship("VerificacionCorreo", uselist=False, back_populates="usuario")
