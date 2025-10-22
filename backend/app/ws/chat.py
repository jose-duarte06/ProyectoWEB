from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from jose import jwt

from ..database import SessionLocal
from ..models.usuario import Usuario
from ..models.chat import ChatSession
from ..models.mensaje import ChatMessage
from ..services.ai import ask_openai
from ..services.rag import search as rag_search, compose_context
from ..config import SECRET_KEY, ALGORITHM

from starlette.websockets import WebSocketState

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def safe_send_json(ws: WebSocket, payload: dict):
    """Envia JSON solo si el socket sigue conectado; ignora errores de cierre."""
    try:
        if ws.application_state == WebSocketState.CONNECTED:
            await ws.send_json(payload)
    except Exception:
        # Cliente cerró el socket; no rompemos el servidor
        pass

@router.websocket("/ws/support")
async def websocket_support(websocket: WebSocket):
    # Autenticación por query param: ?token=Bearer%20<jwt>
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401); return

    try:
        raw = token.replace("Bearer ", "")
        payload = jwt.decode(raw, SECRET_KEY, algorithms=[ALGORITHM])
        correo = payload.get("sub")
        if not correo:
            await websocket.close(code=4401); return
    except Exception:
        await websocket.close(code=4401); return

    # DB session local
    db: Session = next(get_db())

    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
    if not usuario:
        await websocket.close(code=4401); return

    await websocket.accept()

    # crear sesión
    sesion = ChatSession(usuario_id=usuario.id, estado="abierto")
    db.add(sesion); db.commit(); db.refresh(sesion)

    # bienvenida
    welcome_text = "¡Hola! Soy el asistente. ¿En qué te ayudo?"
    welcome_msg = ChatMessage(sesion_id=sesion.id, role="assistant", content=welcome_text)
    db.add(welcome_msg); db.commit()
    await safe_send_json(websocket, {"role": "assistant", "content": welcome_text})
    # bucle de mensajes
    try:
        while True:
            data = await websocket.receive_json()
            user_text = (data or {}).get("content", "").strip()
            if not user_text:
                continue

            msg_user = ChatMessage(sesion_id=sesion.id, role="user", content=user_text)
            db.add(msg_user); db.commit()

            try:
                hits = rag_search(user_text, top_k=4)
                ctx = compose_context(hits) if hits else ""
                answer = ask_openai(
                    [{"role": "user", "content": user_text}],
                    context=ctx
                )
            except RuntimeError:
                answer = "El servicio de IA no está configurado en el servidor."

            msg_ai = ChatMessage(sesion_id=sesion.id, role="assistant", content=answer)
            db.add(msg_ai); db.commit()

            await websocket.send_json({"role": "assistant", "content": answer})

    except WebSocketDisconnect:
        sesion.estado = "cerrado";
        db.commit()
    except Exception:
        sesion.estado = "cerrado";
        db.commit()
    finally:
        db.close()
