from fastapi import FastAPI
from .database import engine, Base
from .routers import producto, usuario, pedido 
from fastapi.middleware.cors import CORSMiddleware 
from .ws import chat as ws_chat 
from .routers import chat as chat_router
from .routers import debug as debug_router
from .routers import rag as rag_router



app = FastAPI()

#CORS para permitir conexion con el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Crear tablas automaticamente
Base.metadata.create_all(bind=engine)

#incluir rutas
app.include_router(usuario.router)
app.include_router(producto.router)
app.include_router(pedido.router)
app.include_router(ws_chat.router)
app.include_router(chat_router.router)
app.include_router(debug_router.router)
app.include_router(rag_router.router)
