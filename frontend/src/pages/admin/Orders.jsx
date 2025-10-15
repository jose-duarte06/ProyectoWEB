import { useEffect, useState } from "react";
import api from "../../services/api";

const ESTADOS = ["abierto", "procesando", "enviado", "entregado", "cancelado"];

export default function OrdersAdmin() {
    const [items, setItems] = useState([]);
    const [msg, setMsg] = useState("");

    async function load() {
        try {
        const r = await api.get("/pedidos"); // endpoint admin
        setItems(r.data);
        } catch {
        setMsg("No se pudieron cargar los pedidos (¿rol admin / token?).");
        }
    }

    useEffect(() => { load(); }, []);

    async function cambiarEstado(id, estado) {
        try {
        await api.patch(`/pedidos/${id}/estado`, { estado });
        setMsg(`Pedido #${id} → ${estado}`);
        await load();
        } catch {
        setMsg("No se pudo cambiar el estado.");
        }
    }

    return (
        <div style={{ padding: "1rem" }}>
        <h2>Pedidos — Admin</h2>
        {msg && <p style={{ color: "#2b7" }}>{msg}</p>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
            <tr style={{ textAlign: "left" }}>
                <th>ID</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Acciones</th>
            </tr>
            </thead>
            <tbody>
            {items.map(p => (
                <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.usuario?.nombre ?? p.usuario_id}</td>
                <td>Q {Number(p.total).toFixed(2)}</td>
                <td>{p.estado}</td>
                <td>
                    <select
                    value={p.estado}
                    onChange={e => cambiarEstado(p.id, e.target.value)}
                    >
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </td>
                </tr>
            ))}
            {!items.length && (
                <tr><td colSpan={5} style={{ padding: 12 }}>No hay pedidos.</td></tr>
            )}
            </tbody>
        </table>
        </div>
    );
}
