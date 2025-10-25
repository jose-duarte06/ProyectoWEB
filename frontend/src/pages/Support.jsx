// frontend/src/pages/Support.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import QuickNav from "../components/QuickNav.jsx";
import "./Support.css";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws/support";

export default function Support() {
    const { token, user } = useAuth();

    const wsRef = useRef(null);
    const connectingRef = useRef(false);
    const manualCloseRef = useRef(false);
    const retryRef = useRef({ timer: null, tries: 0 });
    const keepAliveRef = useRef(null);

    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const logRef = useRef(null);
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (!token) return;
        connect();
        return () => {
        clearRetry();
        clearKeepAlive();
        safeClose(1000, "unmount");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    function push(role, content) {
        setMessages((prev) => [...prev, { role, content, ts: Date.now() }]);
    }
    const pushSys = (t) => push("system", t);

    function connect() {
        // evita sockets duplicados / reconexiones simultáneas
        const cur = wsRef.current;
        if (connectingRef.current) return;
        if (cur && (cur.readyState === WebSocket.OPEN || cur.readyState === WebSocket.CONNECTING)) return;

        connectingRef.current = true;
        manualCloseRef.current = false;

        const url = `${WS_URL}?token=${encodeURIComponent(`Bearer ${token}`)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
        connectingRef.current = false;
        setConnected(true);
        pushSys("Conectado al soporte ✅");
        clearRetry();

        // keep-alive: ping cada 25s; el backend responde {"type":"pong"}
        clearKeepAlive();
        keepAliveRef.current = setInterval(() => {
            try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "ping" }));
            }
            } catch {}
        }, 25000);
        };

        ws.onmessage = (ev) => {
        try {
            const data = JSON.parse(ev.data);
            if (data?.type === "pong") return; // ignora keep-alive
            if (data?.role && data?.content) {
            push(data.role, data.content);
            } else if (data?.content) {
            push("assistant", String(data.content));
            } else {
            push("assistant", String(ev.data));
            }
        } catch {
            push("assistant", String(ev.data));
        }
        };

        ws.onclose = (ev) => {
        connectingRef.current = false;
        setConnected(false);
        clearKeepAlive();
        pushSys(`Conexión cerrada (${ev.code})`);

        // no reconectar si lo cerró el usuario o si es cierre esperado/auth
        if (manualCloseRef.current) return;
        if ([1000, 4401, 1008].includes(ev.code)) return;

        scheduleReconnect();
        };

        ws.onerror = () => {
        // normalmente vendrá seguido por onclose; no hacemos nada aquí
        };
    }

    function scheduleReconnect() {
        const r = retryRef.current;
        if (r.timer) return;
        const tries = (r.tries || 0) + 1;
        r.tries = tries;
        const delay = Math.min(15000, 800 * Math.pow(1.7, tries));
        r.timer = setTimeout(() => {
        r.timer = null;
        connect();
        }, delay);
    }

    function clearRetry() {
        const r = retryRef.current;
        if (r.timer) clearTimeout(r.timer);
        r.timer = null;
        r.tries = 0;
    }

    function clearKeepAlive() {
        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
    }

    function safeClose(code = 1000, reason = "client-close") {
        try {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) ws.close(code, reason);
        if (ws && ws.readyState === WebSocket.CONNECTING) ws.close(code, reason);
        } catch {}
        wsRef.current = null;
        connectingRef.current = false;
    }

    function sendMessage(e) {
        e?.preventDefault?.();
        const ws = wsRef.current;
        const text = input.trim();
        if (!ws || ws.readyState !== WebSocket.OPEN || !text) return;
        push("user", text);
        setInput("");
        try {
        ws.send(JSON.stringify({ content: text }));
        } catch {
        pushSys("No se pudo enviar el mensaje.");
        }
    }

    function handleEnter(e) {
        if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        }
    }

    function newConversation() {
        // cierra limpio y reabre para recibir solo un mensaje de bienvenida
        manualCloseRef.current = true;
        safeClose(1000, "new-conversation");
        setMessages([]);
        setTimeout(connect, 250);
    }

    function closeConversation() {
        manualCloseRef.current = true;
        safeClose(1000, "user-close");
        pushSys("Has cerrado la conversación.");
    }

    if (!user) {
        return (
        <div className="sup-wrap">
            <QuickNav active="support" />
            <div className="card" style={{ maxWidth: 680, margin: "24px auto" }}>
            Necesitas iniciar sesión para usar el soporte.
            </div>
        </div>
        );
    }

    const preview =
        (messages.slice(-1)[0]?.content || "Sin mensajes").slice(0, 60) +
        ((messages.slice(-1)[0]?.content || "").length > 60 ? "…" : "");

    return (
        <div className="sup-wrap">
        {/* navegación rápida debajo del logo */}
        <QuickNav active="support" />

        {/* encabezado (el pill se oculta vía CSS, conservamos el markup por accesibilidad) */}
        <header className="sup-head">
            <h2>Soporte</h2>
            <div className="head-actions">
            <span className={`pill ${connected ? "ok" : "bad"}`}>{connected ? "Conectado" : "Desconectado"}</span>
            <button className="btn" onClick={connect} disabled={connected || connectingRef.current}>
                Reconectar
            </button>
            <button className="btn primary" onClick={newConversation}>
                Nueva conversación
            </button>
            </div>
        </header>

        <div className="sup-layout">
            {/* Sidebar: sesión actual */}
            <aside className="sup-side">
            <ul className="sess-list">
                <li className="sess-item active">
                <div className="sess-row">
                    <b>Sesión actual</b>
                    <span className={`pill ${connected ? "info" : "warn"}`}>{connected ? "Activa" : "Inactiva"}</span>
                </div>
                <div className="sess-prev">{preview}</div>
                <div className="sess-date">{new Date().toLocaleString()}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button className="btn" onClick={closeConversation}>Cerrar chat</button>
                    <button className="btn" onClick={connect}>Reabrir</button>
                </div>
                </li>
            </ul>
            </aside>

            {/* Chat principal */}
            <section className="sup-chat">
            <div className="chat-head">
                <div className="chat-title">Chat con soporte</div>
                <div className="chat-actions">
                <span className={`pill ${connected ? "ok" : "bad"}`}>{connected ? "Online" : "Offline"}</span>
                </div>
            </div>

            <div className="chat-body" ref={logRef}>
                {!messages.length ? (
                <div className="muted p12">No hay mensajes todavía. ¡Escribe el primero!</div>
                ) : (
                messages.map((m, i) => (
                    <div key={i} className={`msg ${m.role === "user" ? "user" : m.role === "system" ? "sys" : "bot"}`}>
                    <div className="bubble">
                        {m.content}
                        <div className="meta">
                        {m.role === "user" ? "Tú" : m.role === "assistant" ? "Agente" : "Sistema"} •{" "}
                        {new Date(m.ts || Date.now()).toLocaleString()}
                        </div>
                    </div>
                    </div>
                ))
                )}
            </div>

            <div className="chat-input">
                <textarea
                className="input ta"
                placeholder={connected ? "Escribe tu mensaje…" : "Reconecta para seguir chateando…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleEnter}
                rows={2}
                disabled={!connected}
                />
                <button className="btn primary" disabled={!connected || !input.trim()} onClick={sendMessage}>
                Enviar
                </button>
            </div>
            </section>
        </div>
        </div>
    );
}