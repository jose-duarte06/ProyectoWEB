# backend/app/routers/analytics.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta

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

# ---------- ENDPOINT QUE ESPERA TU FRONT ----------
@router.get("/resumen")
def resumen(_: Usuario = Depends(verificar_admin), db: Session = Depends(get_db)):
    # KPIs "clásicos"
    total_usuarios  = db.query(func.count(Usuario.id)).scalar() or 0
    total_productos = db.query(func.count(Producto.id)).scalar() or 0
    total_pedidos   = db.query(func.count(Pedido.id)).scalar() or 0

    ventas_totales = (
        db.query(
            func.coalesce(func.sum(DetallePedido.cantidad * DetallePedido.precio_unitario), 0.0)
        )
        .scalar()
        or 0.0
    )

    # pedidos por estado (para el “orders_by_status” del front)
    pedidos_por_estado = (
        db.query(Pedido.estado, func.count(Pedido.id))
        .group_by(Pedido.estado)
        .all()
    )
    pedidos_por_estado = [{"estado": e or "desconocido", "cantidad": c} for (e, c) in pedidos_por_estado]

    # chats/mensajes por si lo usas luego
    total_chats    = db.query(func.count(ChatSession.id)).scalar() or 0
    total_mensajes = db.query(func.count(ChatMessage.id)).scalar() or 0

    return {
        "kpis": {
            "usuarios":  total_usuarios,
            "productos": total_productos,
            "pedidos":   total_pedidos,
            "ventas_totales": float(ventas_totales),
            "chats": total_chats,
            "mensajes": total_mensajes,
        },
        "pedidos_por_estado": pedidos_por_estado,
    }

# ---------- TU DASHBOARD "AVANZADO" (lo dejamos también disponible) ----------
@router.get("/dashboard")
def dashboard(_: Usuario = Depends(verificar_admin), db: Session = Depends(get_db)):
    total_usuarios   = db.query(func.count(Usuario.id)).scalar() or 0
    total_productos  = db.query(func.count(Producto.id)).scalar() or 0
    pendientes = (
        db.query(func.count(Pedido.id))
        .filter(Pedido.estado.in_(["abierto", "pendiente"]))
        .scalar()
        or 0
    )

    now = datetime.utcnow()
    day0        = now.date()
    week_start  = (now - timedelta(days=6)).date()
    prev_start  = (now - timedelta(days=13)).date()
    prev_end    = (now - timedelta(days=7)).date()

    fecha_col = getattr(Pedido, "fecha", None) or getattr(Pedido, "creado_en", None)

    if fecha_col is None:
        ventas_semana_total = 0.0
        weekly_current = [0]*7
        weekly_prev    = [0]*7
        last_orders = db.query(Pedido.id, Pedido.usuario_id, Pedido.estado).order_by(Pedido.id.desc()).limit(10).all()
        orders_rows = []
        for pid, uid, st in last_orders:
            total = (
                db.query(func.coalesce(func.sum(DetallePedido.cantidad * DetallePedido.precio_unitario), 0.0))
                .filter(DetallePedido.pedido_id == pid)
                .scalar()
                or 0.0
            )
            orders_rows.append({"id": pid, "cliente_id": uid, "estado": st, "total": float(total), "fecha": None})
    else:
        ventas_semana_total = (
            db.query(func.coalesce(func.sum(DetallePedido.cantidad * DetallePedido.precio_unitario), 0.0))
            .join(Pedido, Pedido.id == DetallePedido.pedido_id)
            .filter(cast(fecha_col, Date) >= week_start)
            .scalar()
            or 0.0
        )

        orders_today = (
            db.query(Pedido.id, Pedido.usuario_id, Pedido.estado, fecha_col.label("fecha"))
            .filter(cast(fecha_col, Date) == day0)
            .order_by(fecha_col.desc())
            .all()
        )
        orders_rows = []
        for pid, uid, st, fecha in orders_today:
            total = (
                db.query(func.coalesce(func.sum(DetallePedido.cantidad * DetallePedido.precio_unitario), 0.0))
                .filter(DetallePedido.pedido_id == pid)
                .scalar()
                or 0.0
            )
            orders_rows.append({
                "id": pid, "cliente_id": uid, "estado": st, "total": float(total),
                "fecha": fecha.isoformat() if fecha else None
            })

        days_current = [week_start + timedelta(days=i) for i in range(7)]
        weekly_current = []
        for d in days_current:
            total_d = (
                db.query(func.coalesce(func.sum(DetallePedido.cantidad * DetallePedido.precio_unitario), 0.0))
                .join(Pedido, Pedido.id == DetallePedido.pedido_id)
                .filter(cast(fecha_col, Date) == d)
                .scalar()
                or 0.0
            )
            weekly_current.append(float(total_d))

        days_prev = [prev_start + timedelta(days=i) for i in range(7)]
        weekly_prev = []
        for d in days_prev:
            total_d = (
                db.query(func.coalesce(func.sum(DetallePedido.cantidad * DetallePedido.precio_unitario), 0.0))
                .join(Pedido, Pedido.id == DetallePedido.pedido_id)
                .filter(cast(fecha_col, Date) == d)
                .scalar()
                or 0.0
            )
            weekly_prev.append(float(total_d))

    activos_ids = set()
    if fecha_col is not None:
        ids_ped = db.query(Pedido.usuario_id).filter(cast(fecha_col, Date) >= week_start).distinct().all()
        activos_ids.update([uid for (uid,) in ids_ped])

    msj_col = getattr(ChatMessage, "creado_en", None)
    if msj_col is not None:
        ids_msg = (
            db.query(ChatSession.usuario_id)
            .join(ChatMessage, ChatMessage.sesion_id == ChatSession.id)
            .filter(cast(msj_col, Date) >= week_start)
            .distinct()
            .all()
        )
        activos_ids.update([uid for (uid,) in ids_msg])
    total_activos = len(activos_ids)

    def fmt_labels(start):
        return [(start + timedelta(days=i)).strftime("%d/%m") for i in range(7)]

    return {
        "kpis": {
            "usuarios_totales": total_usuarios,
            "usuarios_activos_7d": total_activos,
            "productos_totales": total_productos,
            "pedidos_pendientes": pendientes,
            "ventas_semana_total": float(ventas_semana_total),
        },
        "today_orders": orders_rows,
        "weekly_revenue": {
            "labels_current": fmt_labels(week_start),
            "labels_prev":    fmt_labels(prev_start),
            "current": weekly_current,
            "previous": weekly_prev
        }
    }
