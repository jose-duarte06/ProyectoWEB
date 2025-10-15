from fastapi import FastAPI
from .database import engine, Base
from .routers import producto, usuario
from .routers import pedido
from fastapi.middleware.cors import CORSMiddleware

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

# Incluir rutas
app.include_router(usuario.router)
app.include_router(producto.router)
app.include_router(pedido.router)