// VerifyEmail.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function VerifyEmail() {
    const [correo, setCorreo] = useState("");
    const [codigo, setCodigo] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const nav = useNavigate();

    useEffect(() => {
        // precarga el correo que guardamos al registrarse
        const c = localStorage.getItem("verify_email");
        if (c) setCorreo(c);
    }, []);

    async function onVerify(e) {
        e.preventDefault();
        setErr(""); setMsg("");
        try {
        await api.post("/usuarios/verificar", null, { params: { correo, codigo } });
        setMsg("Correo verificado. Ahora puedes iniciar sesión.");
        // opcional: borra el hint
        localStorage.removeItem("verify_email");
        setTimeout(() => nav("/"), 1000);
        } catch (e) {
        const m = e?.response?.data?.detail || "Código inválido o expirado.";
        setErr(m);
        }
    }

    async function onResend() {
        setErr(""); setMsg("");
        try {
        await api.post("/usuarios/reenvio-verificacion", null, { params: { correo } });
        setMsg("Te reenviamos un código nuevo. Revisa tu bandeja.");
        } catch (e) {
        const m = e?.response?.data?.detail || "No se pudo reenviar el código.";
        setErr(m);
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: "40px auto" }}>
        <h2>Verificar correo</h2>
        <form onSubmit={onVerify} style={{ display: "grid", gap: 8 }}>
            <input placeholder="Correo" value={correo} onChange={e=>setCorreo(e.target.value)} />
            <input placeholder="Código de verificación (6 dígitos)" value={codigo} onChange={e=>setCodigo(e.target.value)} />
            <button>Verificar</button>
        </form>
        <div style={{ marginTop: 8 }}>
            <button type="button" onClick={onResend}>Reenviar código</button>
        </div>
        {msg && <p style={{ color: "green" }}>{msg}</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        </div>
    );
}
