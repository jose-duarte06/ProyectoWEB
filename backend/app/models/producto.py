from sqlalchemy import Column, Integer, String, Float
from ..database import Base

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    imagen_url = Column(String, nullable=False)