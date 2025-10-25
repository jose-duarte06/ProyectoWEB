import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .database import engine, Base

# Importar modelos con alias (asegura creación de tablas)
from .models import (
    usuario as m_usuario,
    producto as m_producto,
    pedido as m_pedido,
    detalle_pedido as m_detalle_pedido,
    chat as m_chat,
    mensaje as m_mensaje,
    token_recuperacion as m_token_recuperacion,
    verificacion as m_verificacion,
    comprobante as m_comprobante,
)

# Routers HTTP
from .routers import usuario as usuario_router
from .routers import producto as producto_router
from .routers import pedido as pedido_router
from .routers import recuperacion as recuperacion_router
from .routers import chat as chat_router
from .routers import rag as rag_router
from .routers import debug as debug_router
from .routers import analytics as analytics_router
from .routers import pagos as pagos_router 

# WebSocket
from .ws import chat as ws_chat

app = FastAPI()

# CORS para permitir conexión con el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas automáticamente
Base.metadata.create_all(bind=engine)

def ensure_columns():
    with engine.begin() as conn:
        conn.execute(text("""
            ALTER TABLE usuarios
            ADD COLUMN IF NOT EXISTS is_verificado BOOLEAN DEFAULT FALSE
        """))
ensure_columns()

# Montar /media para archivos subidos (comprobantes)
os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

# Incluir rutas
app.include_router(usuario_router.router)
app.include_router(producto_router.router)
app.include_router(pedido_router.router)
app.include_router(recuperacion_router.router)
app.include_router(chat_router.router)
app.include_router(rag_router.router)
app.include_router(debug_router.router)
app.include_router(ws_chat.router)            # WebSocket
app.include_router(analytics_router.router)
app.include_router(pagos_router.router)       