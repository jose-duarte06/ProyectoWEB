# backend/app/routers/pedido.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, conint, confloat
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from ..database import SessionLocal
from ..models.usuario import Usuario
from ..models.producto import Producto
from ..models.pedido import Pedido
from ..models.detalle_pedido import DetallePedido
from ..utils.seguridad import obtener_usuario_actual, verificar_admin

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])

# ------------------------
# Helpers DB
# ------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------------
# Schemas de entrada/salida
# ------------------------
class DetalleIn(BaseModel):
    producto_id: conint(gt=0)
    cantidad: conint(gt=0)
    precio_unitario: Optional[confloat(ge=0)] = None  # opcional, se valida vs BD

class PedidoIn(BaseModel):
    detalles: List[DetalleIn]
    total: Optional[confloat(ge=0)] = None  # opcional (calculamos en servidor)

# ------------------------
# Crear pedido (cliente autenticado)
# ------------------------
@router.post("/", summary="Crear pedido del usuario autenticado")
def crear_pedido(
    payload: PedidoIn,
    user: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    if not payload.detalles:
        raise HTTPException(status_code=400, detail="No hay detalles en el pedido.")

    # Traer precios de productos de la BD (no confiar en el cliente)
    ids = [d.producto_id for d in payload.detalles]
    productos = db.query(Producto).filter(Producto.id.in_(ids)).all()
    precio_map = {p.id: float(p.precio or 0) for p in productos}

    # Validar que existan todos los productos
    for d in payload.detalles:
        if d.producto_id not in precio_map:
            raise HTTPException(status_code=400, detail=f"Producto {d.producto_id} no existe.")

    # Calcular total con precios de BD
    total = 0.0
    for d in payload.detalles:
        precio = precio_map[d.producto_id]
        total += precio * d.cantidad

    # Crear cabecera
    ped = Pedido(usuario_id=user.id, total=total, estado="abierto")
    db.add(ped)
    db.commit()
    db.refresh(ped)

    # Crear detalles usando precios de la BD
    bulk = []
    for d in payload.detalles:
        bulk.append(
            DetallePedido(
                pedido_id=ped.id,
                producto_id=d.producto_id,
                cantidad=d.cantidad,
                precio_unitario=precio_map[d.producto_id],
            )
        )
    db.bulk_save_objects(bulk)
    db.commit()

    return {"id": ped.id, "estado": ped.estado, "total": float(ped.total)}

# ------------------------
# Mis pedidos (cliente autenticado)
# ------------------------
@router.get("/", summary="Lista SOLO los pedidos del usuario autenticado")
def mis_pedidos(
    user: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Pedido)
        .filter(Pedido.usuario_id == user.id)
        .order_by(Pedido.id.desc())
        .all()
    )

    # Devolvemos lista “liviana”; los detalles se piden en /pedidos/{id}
    out = []
    for p in rows:
        out.append(
            {
                "id": p.id,
                "usuario_id": p.usuario_id,
                "fecha": (p.fecha.isoformat() if getattr(p, "fecha", None) else None),
                "estado": p.estado,
                "total": float(p.total or 0),
            }
        )
    return out

# ------------------------
# Detalle de un pedido (cliente dueño o admin)
# ------------------------
@router.get("/{pedido_id}", summary="Detalle del pedido")
def detalle_pedido(
    pedido_id: int,
    user: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    p = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Permitir si es dueño o admin
    if (p.usuario_id != user.id) and (user.rol != "administrador"):
        raise HTTPException(status_code=403, detail="No autorizado a ver este pedido")

    # Cargar detalles y nombres de producto
    dets = (
        db.query(DetallePedido, Producto.nombre.label("producto_nombre"))
        .join(Producto, Producto.id == DetallePedido.producto_id)
        .filter(DetallePedido.pedido_id == p.id)
        .all()
    )

    detalles = []
    for d, nombre in dets:
        detalles.append(
            {
                "id": d.id,
                "producto_id": d.producto_id,
                "nombre": nombre,
                "cantidad": int(d.cantidad or 0),
                "precio_unitario": float(d.precio_unitario or 0),
            }
        )

    return {
        "id": p.id,
        "usuario_id": p.usuario_id,
        "fecha": (p.fecha.isoformat() if getattr(p, "fecha", None) else None),
        "estado": p.estado,
        "total": float(p.total or 0),
        "detalles": detalles,
    }

# ------------------------
# (Opcional) Lista de TODOS los pedidos (solo admin)
# ------------------------
@router.get("/todos/admin", summary="Lista todos los pedidos (admin)")
def todos_pedidos_admin(
    _: Usuario = Depends(verificar_admin),
    db: Session = Depends(get_db),
):
    rows = db.query(Pedido).order_by(Pedido.id.desc()).all()
    return [
        {
            "id": p.id,
            "usuario_id": p.usuario_id,
            "fecha": (p.fecha.isoformat() if getattr(p, "fecha", None) else None),
            "estado": p.estado,
            "total": float(p.total or 0),
        }
        for p in rows
    ]