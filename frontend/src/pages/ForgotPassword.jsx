import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "./Recover.css";

export default function ForgotPassword() {
    const [step, setStep] = useState("request"); // "request" | "reset"
    const [correo, setCorreo] = useState("");
    const [token, setToken] = useState("");
    const [nueva, setNueva] = useState("");
    const [showPwd, setShowPwd] = useState(false);

    const [loading, setLoading] = useState(false);
    const [ok, setOk] = useState("");
    const [err, setErr] = useState("");

    const [qs] = useSearchParams();
    const nav = useNavigate();

    // Si viene ?token=abc en la URL, saltamos directo al paso de reset
    useEffect(() => {
        const t = qs.get("token");
        if (t) {
        setToken(t);
        setStep("reset");
        }
    }, [qs]);

    async function onRequest(e) {
        e.preventDefault();
        setOk(""); setErr("");
        setLoading(true);
        try {
        await api.post("/recuperacion/recuperar", { correo });
        setOk("Listo. Te enviamos un token de recuperación por correo.");
        setStep("reset");
        } catch (e) {
        const msg = e?.response?.data?.detail || "No pudimos procesar la solicitud.";
        setErr(msg);
        } finally {
        setLoading(false);
        }
    }

    async function onReset(e) {
        e.preventDefault();
        setOk(""); setErr("");
        setLoading(true);
        try {
        await api.post("/recuperacion/reset-password", { token, nueva });
        setOk("Contraseña actualizada. Redirigiendo al inicio de sesión…");
        setTimeout(() => nav("/"), 1200);
        } catch (e) {
        const msg = e?.response?.data?.detail || "No se pudo actualizar la contraseña.";
        setErr(msg);
        } finally {
        setLoading(false);
        }
    }

    return (
        <div className="auth-wrap">
        <div className="auth-card">
            <div className="auth-logo">
            <img src="/imagenes/LogoMotekaRacing.png" alt="Moteka" />
            </div>

            <h1 className="auth-title">Recuperar contraseña</h1>
            <p className="auth-sub">
            {step === "request"
                ? "Ingresa tu correo y te enviaremos un token."
                : "Ingresa el token que recibiste y tu nueva contraseña."}
            </p>

            {step === "request" && (
            <form className="auth-form" onSubmit={onRequest}>
                <label className="auth-label">
                Correo *
                <input
                    className="auth-input"
                    type="email"
                    placeholder="tu@correo.com"
                    value={correo}
                    onChange={e => setCorreo(e.target.value)}
                    required
                />
                </label>

                <button className="auth-btn" disabled={loading}>
                {loading ? "Enviando…" : "Enviar token"}
                </button>

                {ok && <div className="auth-ok">{ok}</div>}
                {err && <div className="auth-err">{err}</div>}
            </form>
            )}

            {step === "reset" && (
            <form className="auth-form" onSubmit={onReset}>
                <label className="auth-label">
                Token *
                <input
                    className="auth-input"
                    placeholder="Pega aquí el token recibido"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    required
                />
                </label>

                <label className="auth-label pwd-field">
                Nueva contraseña *
                <input
                    className="auth-input"
                    type={showPwd ? "text" : "password"}
                    placeholder="Escribe tu nueva contraseña"
                    value={nueva}
                    onChange={e => setNueva(e.target.value)}
                    minLength={6}
                    required
                />
                <button
                    type="button"
                    className="pwd-toggle"
                    onClick={() => setShowPwd(s => !s)}
                >
                    {showPwd ? "Ocultar" : "Mostrar"}
                </button>
                </label>

                <button className="auth-btn" disabled={loading}>
                {loading ? "Aplicando…" : "Restablecer contraseña"}
                </button>

                {ok && <div className="auth-ok">{ok}</div>}
                {err && <div className="auth-err">{err}</div>}
            </form>
            )}

            <div className="auth-help">
            <Link to="/">Volver a iniciar sesión</Link>
            </div>
        </div>
        </div>
    );
}