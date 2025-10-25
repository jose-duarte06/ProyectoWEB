from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from jose import jwt
from starlette.websockets import WebSocketState

from ..database import SessionLocal
from ..models.usuario import Usuario
from ..models.chat import ChatSession
from ..models.mensaje import ChatMessage
from ..services.ai import ask_openai
from ..services.rag import search as rag_search, compose_context
from ..config import SECRET_KEY, ALGORITHM

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def safe_send_json(ws: WebSocket, payload: dict):
    try:
        if ws.application_state == WebSocketState.CONNECTED:
            await ws.send_json(payload)
    except Exception:
        pass

@router.websocket("/ws/support")
async def websocket_support(websocket: WebSocket):
    # --- Auth por query param: ?token=Bearer%20<jwt> ---
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

    # DB
    db_gen = get_db()
    db: Session = next(db_gen)
    try:
        usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
        if not usuario:
            await websocket.close(code=4401); return

        await websocket.accept()

        # crear sesión y bienvenida
        sesion = ChatSession(usuario_id=usuario.id, estado="abierto")
        db.add(sesion); db.commit(); db.refresh(sesion)

        welcome = "¡Hola! Soy el asistente. ¿En qué te ayudo?"
        db.add(ChatMessage(sesion_id=sesion.id, role="assistant", content=welcome))
        db.commit()
        await safe_send_json(websocket, {"role": "assistant", "content": welcome})

        # bucle
        while True:
            data = await websocket.receive_json()
            if not isinstance(data, dict):
                continue

            # keep-alive del cliente
            if data.get("type") == "ping":
                await safe_send_json(websocket, {"type": "pong"})
                continue

            user_text = (data or {}).get("content", "")
            user_text = (user_text or "").strip()
            if not user_text:
                continue

            # guarda mensaje del usuario
            msg_user = ChatMessage(sesion_id=sesion.id, role="user", content=user_text)
            db.add(msg_user); db.commit()

            # respuesta con RAG/IA (tolerante a fallos)
            try:
                hits = rag_search(user_text, top_k=4)
                ctx = compose_context(hits) if hits else ""
                answer = ask_openai([{"role": "user", "content": user_text}], context=ctx)
            except Exception:
                answer = "El servicio de IA no está disponible."

            db.add(ChatMessage(sesion_id=sesion.id, role="assistant", content=answer))
            db.commit()
            await safe_send_json(websocket, {"role": "assistant", "content": answer})

    except WebSocketDisconnect:
        try:
            sesion.estado = "cerrado"; db.commit()
        except Exception:
            pass
    except Exception:
        # cierra limpio si algo truena
        try:
            sesion.estado = "cerrado"; db.commit()
        except Exception:
            pass
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        try:
            next(db_gen)  # exhaust generator finally -> close
        except StopIteration:
            pass