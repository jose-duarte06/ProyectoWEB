import { useState } from "react";
import api from "../services/api";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
    const nav = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setErr(""); setOk("");
        try {
        await api.post("/usuarios/registro", { nombre, apellido, correo, contrasena });
        // Guardamos el correo para prellenar en la verificación
        localStorage.setItem("verify_email", correo);
        setOk("Te enviamos un código de verificación a tu correo. Verifícalo para poder iniciar sesión.");
        // Redirige a la pantalla de verificación
        nav("/verificar");
        } catch (e) {
        const msg = e?.response?.data?.detail || "Error al registrar (correo duplicado o servidor).";
        setErr(msg);
        }
    }

    return (
        <div style={{ maxWidth: 520, margin: "40px auto" }}>
        <h2>Registro</h2>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
            <input placeholder="Nombre" value={nombre} onChange={e=>setNombre(e.target.value)} />
            <input placeholder="Apellido" value={apellido} onChange={e=>setApellido(e.target.value)} />
            <input placeholder="Correo" value={correo} onChange={e=>setCorreo(e.target.value)} />
            <input placeholder="Contraseña" type="password" value={contrasena} onChange={e=>setContrasena(e.target.value)} />
            <button>Crear cuenta</button>
        </form>
        {ok && <p style={{ color: "green" }}>{ok}</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        
        </div>
    );
}
