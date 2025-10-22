// frontend/src/pages/Support.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws/support";

export default function Support() {
    const { token, user } = useAuth(); // asumo que tu AuthContext expone token y user
    const [ws, setWs] = useState(null);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]); // {role, content}
    const [input, setInput] = useState("");
    const logRef = useRef(null);

    useEffect(() => {
        // auto-scroll al final cuando llegan mensajes
        if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        // abre conexión al montar
        if (!token) return; // requiere login
        const url = `${WS_URL}?token=${encodeURIComponent(`Bearer ${token}`)}`;
        const socket = new WebSocket(url);

        socket.onopen = () => {
        setConnected(true);
        setMessages(prev => [...prev, { role: "system", content: "Conectado al soporte ✅" }]);
        };
        socket.onmessage = (ev) => {
        try {
            const data = JSON.parse(ev.data);
            if (data?.role && data?.content) {
            setMessages(prev => [...prev, { role: data.role, content: data.content }]);
            } else {
            // mensajes no JSON
            setMessages(prev => [...prev, { role: "assistant", content: String(ev.data) }]);
            }
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: String(ev.data) }]);
        }
        };
        socket.onclose = () => {
        setConnected(false);
        setMessages(prev => [...prev, { role: "system", content: "Conexión cerrada ❌" }]);
        };
        socket.onerror = () => {
        setMessages(prev => [...prev, { role: "system", content: "Error de WebSocket" }]);
        };

        setWs(socket);
        return () => socket.close();
    }, [token]);

    function sendMessage(e) {
        e?.preventDefault?.();
        if (!ws || ws.readyState !== 1) return;
        const text = input.trim();
        if (!text) return;
        // agrego en UI de una vez
        setMessages(prev => [...prev, { role: "user", content: text }]);
        ws.send(JSON.stringify({ content: text }));
        setInput("");
    }

    if (!user) {
        return <div style={{maxWidth: 640, margin: "40px auto"}}>Necesitas iniciar sesión para usar el soporte.</div>;
    }

    return (
        <div style={{ maxWidth: 720, margin: "24px auto", display: "grid", gap: 12 }}>
        <h2>Soporte en tiempo real</h2>
        <div style={{ fontSize: 14, color: connected ? "green" : "crimson" }}>
            Estado: {connected ? "Conectado" : "Desconectado"}
        </div>

        <div ref={logRef} style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            height: 420,
            overflowY: "auto",
            background: "#fafafa"
        }}>
            {messages.map((m, i) => (
            <div key={i} style={{
                marginBottom: 10,
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start"
            }}>
                <div style={{
                maxWidth: "80%",
                padding: "8px 12px",
                borderRadius: 12,
                background: m.role === "user" ? "#cce5ff" : (m.role === "assistant" ? "#e2ffe2" : "#eee"),
                whiteSpace: "pre-wrap"
                }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                    {m.role === "user" ? "Tú" : m.role === "assistant" ? "Asistente" : "Sistema"}
                </div>
                {m.content}
                </div>
            </div>
            ))}
        </div>

        <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
            <input
            placeholder="Escribe tu mensaje..."
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd" }}
            />
            <button disabled={!connected || !input.trim()}>Enviar</button>
        </form>
        </div>
    );
}
