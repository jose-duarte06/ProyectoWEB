import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";


export default function Login() {
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [err, setErr] = useState("");
    const { login } = useAuth();
    const nav = useNavigate();

    
    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        try {
            await login(correo, contrasena);
            // ...
            } catch (e) {
            const status = e?.response?.status;
            const msg = e?.response?.data?.detail || "Error iniciando sesión";
            if (status === 403) {
                localStorage.setItem("verify_email", correo); // para precargar
                // muestra mensaje claro
                setErr(msg + ". Revisa tu correo e ingresa el código.");
                // opcional: nav("/verificar");
            } else {
                setErr(msg);
            }
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: "40px auto" }}>
        <br></br>
        <h2>Iniciar sesión</h2>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
            <input
            placeholder="Correo"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            />
            <input
            placeholder="Contraseña"
            type="password"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            />
            <button>Entrar</button>
        </form>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        
        <p>¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
        </div>
    );
}
