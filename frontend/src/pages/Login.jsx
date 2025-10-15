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
        nav("/admin"); // si es admin entra
         // Decide destino por rol
        const {data: me } = await api.get("/usuarios/perfil");
        nav(me.rol === "administrador" ? "/admin" : "/pedidos");
        } catch {
        setErr("Credenciales inválidas o servidor no disponible");
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: "40px auto" }}>
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
