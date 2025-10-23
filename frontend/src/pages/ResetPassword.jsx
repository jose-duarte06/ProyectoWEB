// frontend/src/pages/ResetPassword.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function ResetPassword() {
    const [token, setToken] = useState("");
    const [nueva, setNueva] = useState("");
    const [ok, setOk] = useState("");
    const [err, setErr] = useState("");
    const nav = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setOk(""); setErr("");
        try {
        await api.post("/recuperacion/reset-password", { token, nueva });
        setOk("Contraseña actualizada. Ya puedes iniciar sesión.");
        setTimeout(() => nav("/"), 1200);
        } catch (e) {
        const msg = e?.response?.data?.detail || "No se pudo actualizar la contraseña.";
        setErr(msg);
        }
    }

    return (
        <div style={{ maxWidth: 460, margin: "40px auto" }}>
        <h2>Restablecer contraseña</h2>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
            <input
            placeholder="Token recibido por correo"
            value={token}
            onChange={e=>setToken(e.target.value)}
            />
            <input
            placeholder="Nueva contraseña"
            type="password"
            value={nueva}
            onChange={e=>setNueva(e.target.value)}
            />
            <button>Restablecer</button>
        </form>
        {ok && <p style={{ color: "green" }}>{ok}</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        <p><Link to="/olvide">¿Necesitas reenviar el token?</Link></p>
        </div>
    );
}
