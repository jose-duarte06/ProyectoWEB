from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.producto import Producto
from ..models.usuario import Usuario
from ..schemas.producto import ProductoCrear, ProductoRespuesta
from ..utils.seguridad import verificar_admin

router = APIRouter(prefix="/productos", tags=["Productos"])

# Dependencia para obtener la sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Crear producto
@router.post("/", response_model=ProductoRespuesta)
def crear_producto(
    producto: ProductoCrear,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verificar_admin)
):

    data = producto.model_dump(mode = "json")
    nuevo = Producto(**data)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

# Listar productos
@router.get("/", response_model=list[ProductoRespuesta])
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).all()

# Obtener producto por ID
@router.get("/{producto_id}", response_model=ProductoRespuesta)
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p

# Actualizar producto
@router.put("/{producto_id}", response_model=ProductoRespuesta)
def actualizar_producto(
    producto_id: int,
    datos: ProductoCrear,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verificar_admin),
):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(404, detail="Producto no encontrado")
    
    data = datos.model_dump(mode="json")
    for key, value in data.items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p

# Eliminar producto
@router.delete("/{producto_id}")
def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verificar_admin),
):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    db.delete(p)
    db.commit()
    return {"mensaje": "Producto eliminado correctamente"}