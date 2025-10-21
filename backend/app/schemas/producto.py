from pydantic import BaseModel, Field, HttpUrl

class ProductoCrear(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    precio: float = Field(..., ge=0)
    descripcion: str = Field(..., max_length=500)
    imagen_url: HttpUrl = Field(...)  # Usa HttpUrl para validar que sea una URL válida

class ProductoRespuesta(ProductoCrear):
    id: int

    class Config:
        from_attributes = True
