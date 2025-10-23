from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import SessionLocal
from ..utils.seguridad import verificar_admin
from ..models.usuario import Usuario
from ..models.producto import Producto
from ..models.pedido import Pedido
from ..models.detalle_pedido import DetallePedido
from ..models.chat import ChatSession
from ..models.mensaje import ChatMessage

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/resumen")
def resumen(_: Usuario = Depends(verificar_admin), db: Session = Depends(get_db)):
    # KPIs
    total_usuarios = db.query(func.count(Usuario.id)).scalar() or 0
    total_productos = db.query(func.count(Producto.id)).scalar() or 0
    total_pedidos   = db.query(func.count(Pedido.id)).scalar() or 0

    # ventas totales ($) sumando detalle_pedido.cantidad * detalle_pedido.precio_unitario
    ventas_totales = (
        db.query(func.coalesce(func.sum(DetallePedido.cantidad * DetallePedido.precio_unitario), 0))
        .scalar()
        or 0
    )

    # pedidos por estado
    pedidos_por_estado = (
        db.query(Pedido.estado, func.count(Pedido.id))
        .group_by(Pedido.estado)
        .all()
    )
    pedidos_por_estado = [{"estado": e or "desconocido", "cantidad": c} for e, c in pedidos_por_estado]

    # chats y mensajes
    total_chats = db.query(func.count(ChatSession.id)).scalar() or 0
    total_mensajes = db.query(func.count(ChatMessage.id)).scalar() or 0

    # top intents/keywords (simple: conteo de palabras de usuario, ignorando cortas)
    stop = {"de","la","el","los","las","y","o","a","en","un","una","para","con","que","se","por","del","al","mi","me","es","son","hay","si"}
    # solo mensajes de rol usuario
    texts = db.query(ChatMessage.content).filter(ChatMessage.role == "user").all()
    from collections import Counter
    cnt = Counter()
    for (t,) in texts:
        if not t: continue
        for w in t.lower().replace("¿","").replace("?","").replace(","," ").replace("."," ").split():
            if len(w) < 3 or w in stop: 
                continue
            cnt[w] += 1
    top_keywords = [{"keyword": k, "count": c} for k, c in cnt.most_common(10)]

    return {
        "kpis": {
            "usuarios": total_usuarios,
            "productos": total_productos,
            "pedidos": total_pedidos,
            "ventas_totales": float(ventas_totales),
            "chats": total_chats,
            "mensajes": total_mensajes,
        },
        "pedidos_por_estado": pedidos_por_estado,
        "top_keywords": top_keywords,
    }
