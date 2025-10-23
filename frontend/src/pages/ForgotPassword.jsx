// frontend/src/pages/ForgotPassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {

    const [step, setStep] = useState("request");
    const [correo, setCorreo] = useState("");
    const [token, setToken] = useState("");
    const [nueva, setNueva] = useState("");
    const [ok, setOk] = useState("");
    const [err, setErr] = useState("");
    const nav = useNavigate();

    async function onRequest(e) {
        e.preventDefault();
        setOk(""); setErr("");
        try {
        await api.post("/recuperacion/recuperar", { correo });
        setOk("Revisa tu correo: te enviamos un token de recuperación.");
        setStep("reset");
        } catch (e) {
        const msg = e?.response?.data?.detail || "No pudimos procesar la solicitud.";
        setErr(msg);
        }
    }

    async function onReset(e) {
        e.preventDefault();
        setOk(""); setErr("");
        try {
        await api.post("/recuperacion/reset-password", { token, nueva });
        setOk("Contraseña actualizada. Redirigiendo a inicio de sesión...");
        setTimeout(() => nav("/"), 1200);
        } catch (e) {
        const msg = e?.response?.data?.detail || "No se pudo actualizar la contraseña.";
        setErr(msg);
        }
    }

    return (
        <div style={{ maxWidth: 480, margin: "40px auto", display: "grid", gap: 16 }}>
        <h2>Recuperar contraseña</h2>

        <form onSubmit={onRequest} style={{ display: "grid", gap: 8 }}>
            <input
            placeholder="Tu correo"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            />
            <button>Enviar token</button>
        </form>

        {step === "reset" && (
            <form onSubmit={onReset} style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <input
                placeholder="Token recibido por correo"
                value={token}
                onChange={e => setToken(e.target.value)}
            />
            <input
                placeholder="Nueva contraseña"
                type="password"
                value={nueva}
                onChange={e => setNueva(e.target.value)}
            />
            <button>Restablecer contraseña</button>
            </form>
        )}

        {ok && <p style={{ color: "green" }}>{ok}</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        </div>
    );
}
