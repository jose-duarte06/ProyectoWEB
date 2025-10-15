import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [msg, setMsg] = useState("");
    const nav = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setMsg("");
        try {
        await api.post("/usuarios/registro", {
            nombre, apellido, correo, contrasena
        });
        setMsg("Usuario creado, ahora inicia sesión.");
        setTimeout(() => nav("/"), 700);
        } catch {
        setMsg("Error al registrar (correo duplicado o servidor).");
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
        {msg && <p>{msg}</p>}
        </div>
    );
}
