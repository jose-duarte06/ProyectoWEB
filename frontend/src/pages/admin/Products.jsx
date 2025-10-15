import { useEffect, useState } from "react";
import api from "../../services/api";

const emptyForm = { nombre: "", precio: "", descripcion: "", imagen_url: "" };

export default function ProductsAdmin() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [msg, setMsg] = useState("");

    async function load() {
        try {
        const r = await api.get("/productos");
        setItems(r.data);
        } catch {
        setMsg("No se pudo cargar el listado de productos.");
        }
    }

    useEffect(() => { load(); }, []);

    function onChange(e) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    }

    async function onSubmit(e) {
        e.preventDefault();
        setMsg("");
        const payload = {
        nombre: form.nombre.trim(),
        precio: Number(form.precio),
        descripcion: form.descripcion.trim(),
        imagen_url: form.imagen_url.trim() || null,
        };
        try {
        if (editingId) {
            await api.put(`/productos/${editingId}`, payload);
            setMsg("Producto actualizado.");
        } else {
            await api.post(`/productos`, payload);
            setMsg("Producto creado.");
        }
        setForm(emptyForm);
        setEditingId(null);
        await load();
        } catch {
        setMsg("Error guardando el producto (revisa permisos o payload).");
        }
    }

    function onEdit(p) {
        setEditingId(p.id);
        setForm({
        nombre: p.nombre ?? "",
        precio: p.precio ?? "",
        descripcion: p.descripcion ?? "",
        imagen_url: p.imagen_url ?? "",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function onDelete(id) {
        if (!confirm("¿Eliminar este producto?")) return;
        setMsg("");
        try {
        await api.delete(`/productos/${id}`);
        setMsg("Producto eliminado.");
        await load();
        } catch {
        setMsg("No se pudo eliminar (quizá falta permiso o hay relaciones).");
        }
    }

    function onCancel() {
        setEditingId(null);
        setForm(emptyForm);
    }

    return (
        <div style={{ padding: "1rem" }}>
        <h2>Productos — Admin</h2>
        {msg && <p style={{ color: "#2b7", fontWeight: 600 }}>{msg}</p>}

        {/* Formulario crear/editar */}
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 520, marginBottom: 20 }}>
            <input
            name="nombre"
            placeholder="Nombre"
            value={form.nombre}
            onChange={onChange}
            required
            />
            <input
            name="precio"
            placeholder="Precio (Q)"
            type="number"
            step="0.01"
            value={form.precio}
            onChange={onChange}
            required
            />
            <input
            name="imagen_url"
            placeholder="URL de imagen (opcional)"
            value={form.imagen_url}
            onChange={onChange}
            />
            <textarea
            name="descripcion"
            placeholder="Descripción"
            rows={3}
            value={form.descripcion}
            onChange={onChange}
            />
            <div style={{ display: "flex", gap: 8 }}>
            <button type="submit">{editingId ? "Guardar cambios" : "Crear producto"}</button>
            {editingId && <button type="button" onClick={onCancel}>Cancelar</button>}
            </div>
        </form>

        {/* Tabla */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
            <tr style={{ textAlign: "left" }}>
                <th>ID</th><th>Nombre</th><th>Precio</th><th>Imagen</th><th>Acciones</th>
            </tr>
            </thead>
            <tbody>
            {items.map((p) => (
                <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.nombre}</td>
                <td>Q {Number(p.precio).toFixed(2)}</td>
                <td>{p.imagen_url ? <img src={p.imagen_url} alt="" width={60} /> : "-"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onEdit(p)}>Editar</button>
                    <button onClick={() => onDelete(p.id)}>Eliminar</button>
                </td>
                </tr>
            ))}
            {!items.length && (
                <tr><td colSpan={5} style={{ padding: 12 }}>No hay productos aún.</td></tr>
            )}
            </tbody>
        </table>
        </div>
    );
}
