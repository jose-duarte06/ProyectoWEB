import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "./Register.css";

export default function Register() {
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [showPwd, setShowPwd] = useState(false);

    const [loading, setLoading] = useState(false);
    const [ok, setOk] = useState("");
    const [err, setErr] = useState("");

    const nav = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setErr(""); setOk("");
        setLoading(true);
        try {
        await api.post("/usuarios/registro", {
            nombre, apellido, correo, contrasena,
        });
        localStorage.setItem("verify_email", correo);
        setOk("Te enviamos un código de verificación. ¡Revísalo!");
        setTimeout(() => nav("/verificar"), 900);
        } catch (e) {
        const msg = e?.response?.data?.detail || "No se pudo registrar.";
        setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
        setLoading(false);
        }
    }

    return (
        <div className="auth-wrap">
        <div className="auth-card">
            <div className="auth-logo">
            {/* Ajusta tamaño del logo editando el CSS (.auth-logo img) */}
            <img src="/imagenes/LogoMotekaRacing.png" alt="Moteka" />
            </div>

            <h1 className="auth-title">Crear cuenta</h1>
            <p className="auth-sub">Únete para comprar en nuestra tienda.</p>

            <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">
                Nombre *
                <input
                className="auth-input"
                placeholder="Tu nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                />
            </label>

            <label className="auth-label">
                Apellido *
                <input
                className="auth-input"
                placeholder="Tu apellido"
                value={apellido}
                onChange={e => setApellido(e.target.value)}
                required
                />
            </label>

            <label className="auth-label">
                Correo *
                <input
                className="auth-input"
                type="email"
                placeholder="ejemplo@moteka.com"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                required
                />
            </label>

            <label className="auth-label pwd-field">
                Contraseña *
                <input
                className="auth-input"
                type={showPwd ? "text" : "password"}
                placeholder="Crea una contraseña"
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
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
                {loading ? "Creando cuenta…" : "Registrarme"}
            </button>

            {ok && <div className="auth-ok">{ok}</div>}
            {err && <div className="auth-err">{err}</div>}
            </form>

            <div className="auth-help">
            ¿Ya tienes cuenta? <Link to="/">Inicia sesión</Link>
            </div>
        </div>
        </div>
    );
}