from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..utils.seguridad import obtener_usuario_actual
from ..models.usuario import Usuario
from ..models.chat import ChatSession
from ..models.mensaje import ChatMessage
from ..services.ai import ask_openai

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.websocket("/ws/support")
async def websocket_support(websocket: WebSocket, db: Session = Depends(get_db)):
    # Autenticación simple vía query param token: ws://host/ws/support?token=Bearer%20XXX
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)  # no auth
        return

    # Validar token usando el mismo dep que HTTP
    try:
        # Hacemos un Request-like fake: el dep real usa OAuth2PasswordBearer,
        # pero aquí validamos manualmente reutilizando la lógica de seguridad.
        from jose import jwt
        from ..config import SECRET_KEY, ALGORITHM
        payload = jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM])
        correo = payload.get("sub")
        if not correo:
            await websocket.close(code=4401); return
        usuario = db.query(Usuario).filter(Usuario.correo == correo).first()
        if not usuario:
            await websocket.close(code=4401); return
    except Exception:
        await websocket.close(code=4401)
        return

    await websocket.accept()

    # Crear sesión nueva
    sesion = ChatSession(usuario_id=usuario.id, estado="abierto")
    db.add(sesion); db.commit(); db.refresh(sesion)

    # Mensaje de bienvenida opcional
    welcome = ChatMessage(sesion_id=sesion.id, role="assistant", content="¡Hola! Soy el asistente. ¿En qué te ayudo?")
    db.add(welcome); db.commit(); db.refresh(welcome)
    await websocket.send_json({"role": "assistant", "content": welcome.content})

    try:
        while True:
            data = await websocket.receive_json()
            user_text = (data or {}).get("content", "").strip()
            if not user_text:
                continue

            # Guardar mensaje del usuario
            m_user = ChatMessage(sesion_id=sesion.id, role="user", content=user_text)
            db.add(m_user); db.commit(); db.refresh(m_user)

            # Llamar OpenAI (sin RAG por ahora)
            try:
                answer = ask_openai([{"role":"user","content": user_text}])
            except RuntimeError as e:
                answer = "El servicio de IA no está configurado en el servidor."

            # Guardar respuesta
            m_assistant = ChatMessage(sesion_id=sesion.id, role="assistant", content=answer)
            db.add(m_assistant); db.commit(); db.refresh(m_assistant)

            # Enviar al cliente
            await websocket.send_json({"role":"assistant","content": answer})

    except WebSocketDisconnect:
        sesion.estado = "cerrado"
        db.commit()
