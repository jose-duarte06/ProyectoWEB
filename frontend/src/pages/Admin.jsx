import { useEffect, useState } from "react";
import api from "../services/api";
import ProductsAdmin from "./admin/Products.jsx";
import OrdersAdmin from "./admin/Orders.jsx";
import AdminDocs from "./admin/AdminDocs.jsx";
import AdminAnalytics from "./admin/AdminAnalytics.jsx";

export default function Admin() {
    const [me, setMe] = useState(null);
    const [tab, setTab] = useState("productos")
    const [err, setErr] = useState("");

    useEffect(() => {
        api.get("/usuarios/perfil").then(r => setMe(r.data))
        .catch(() => setErr("No autorizado o sesion expirada."));
    }, []);

    return (
        <div style={{ padding: "1rem" }}>
        <h2>Panel Admin</h2>
        {me && <p>Hola, {me.nombre} — rol: {me.rol}</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            <button onClick={() => setTab("productos")}>Productos</button>
            <button onClick={() => setTab("pedidos")}>Pedidos</button>
            <button onClick={() => setTab("docs")}>Documentación</button>
            <button onClick={() => setTab("analytics")}>Analítica</button>
            <button onClick={() => setTab("chats")}>Chats</button>
        </div>

        {tab === "productos" && <ProductsAdmin />}
        {tab === "pedidos" && <OrdersAdmin />}
        {tab === "docs" && <AdminDocs />}
        {tab == "analytics" && <AdminAnalytics />}

        </div>
    );
}
