import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./Login.css"; // 👈 estilos de esta pantalla

export default function Login() {
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [remember, setRemember] = useState(true);
    const [err, setErr] = useState("");
    const { login } = useAuth();
    const nav = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        try {
        await login(correo, contrasena);

        // ✔ Si no quiere recordar sesión, mover el token a sessionStorage
        if (!remember) {
            const tok = localStorage.getItem("token");
            if (tok) {
            sessionStorage.setItem("token", tok);
            localStorage.removeItem("token");
            }
        }

        // Redirige a productos (o a lo que prefieras)
        nav("/productos");
        } catch (e) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.detail || "Error iniciando sesión";
        if (status === 403) {
            localStorage.setItem("verify_email", correo);
            setErr(msg + ". Revisa tu correo e ingresa el código.");
        } else {
            setErr(msg);
        }
        }
    }

    return (
        <div className="login-wrap">
        <div className="card">
            <div className="logo">
            <img src="/imagenes/LogoMotekaRacing.png" alt="Moteka" />
            </div>

            <form onSubmit={onSubmit} className="form">
            <label className="label">
                Correo / Usuario <span className="req">*</span>
            </label>
            <input
                className="input"
                placeholder="ejemplo@moteka.com o admin"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
            />

            <label className="label">
                Contraseña <span className="req">*</span>
            </label>
            <input
                className="input"
                type="password"
                placeholder="Ingrese su contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
            />

            <div className="row">
                <label className="remember">
                <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                />
                Recordar sesión
                </label>

                <Link className="link" to="/olvide">
                ¿Olvidó su contraseña?
                </Link><p>¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
        
            </div>

            <button className="btn" type="submit">
                Iniciar Sesión
            </button>
            </form>

            {err && <div className="error">{err}</div>}

            <div className="footer">© 2025 Moteka Management System.</div>
        </div>
        </div>
    );
}