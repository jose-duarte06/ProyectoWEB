from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import SessionLocal
from ..models.pedido import Pedido
from ..models.detalle_pedido import DetallePedido
from ..schemas.pedido import PedidoCrear, PedidoRespuesta, EstadoPedidoIn
from ..utils.seguridad import obtener_usuario_actual, verificar_admin
from ..models.usuario import Usuario

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])

# Dependencia para obtener la sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Crear pedido (cliente)
@router.post("/", response_model=PedidoRespuesta)
def crear_pedido(
    datos: PedidoCrear,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    nuevo_pedido = Pedido(usuario_id=usuario.id, total=datos.total)
    db.add(nuevo_pedido)
    db.commit()
    db.refresh(nuevo_pedido)

    for item in datos.detalles:
        detalle = DetallePedido(
            pedido_id=nuevo_pedido.id,
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
        )
        db.add(detalle)
    db.commit()

    pedido = (
        db.query(Pedido)
        .options(joinedload(Pedido.detalles))
        .filter(Pedido.id == nuevo_pedido.id)
        .first()
    )
    return pedido

# Ver historial de pedidos (cliente)
@router.get("/mis-pedidos", response_model=list[PedidoRespuesta])
def ver_mis_pedidos(
    db: Session = Depends(get_db), 
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return db.query(Pedido).filter(Pedido.usuario_id == usuario.id).all()

# Ver todos los pedidos (administrador)
@router.get("/", response_model=list[PedidoRespuesta])
def ver_todos_los_pedidos(
    db: Session = Depends(get_db), 
    _:Usuario = Depends(verificar_admin),
):
    return db.query(Pedido).all()

#cambiar estado del Pedido (admin)

@router.patch("/{pedido_id}/estado", response_model = PedidoRespuesta)
@router.patch("/{pedido_id}/estado/", response_model = PedidoRespuesta)
def cambiar_estado_pedido(
    pedido_id: int,
    body: EstadoPedidoIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verificar_admin),
):
    pedido =(
        db.query(Pedido)
        .options(joinedload(Pedido.detalles))
        .filter(Pedido.id == pedido_id)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    pedido.estado = body.estado
    db.commit()
    db.refresh(pedido)
    return pedido

@router.get("/{pedido_id}", response_model=PedidoRespuesta)
def obtener_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verificar_admin),
):
    pedido = (
        db.query(Pedido)
        .options(joinedload(Pedido.detalles))
        .filter(Pedido.id == pedido_id)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido