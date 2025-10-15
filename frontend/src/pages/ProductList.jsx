import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function ProductList() {
    const [data, setData] = useState([]);
    const { add } = useCart();

    useEffect(() => {
        api.get("/productos").then(r => setData(r.data)).catch(() => setData([]));
    }, []);

    return (
        <div>
        <h2>Productos</h2>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
            {data.map(p => (
            <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <img src={p.imagen_url} alt={p.nombre} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }} />
                <h3 style={{ margin: "8px 0" }}>{p.nombre}</h3>
                <p style={{ margin: 0 }}>Q {p.precio}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => add(p, 1)}>Agregar</button>
                <Link to={`/productos/${p.id}`}><button>Ver</button></Link>
                </div>
            </div>
            ))}
        </div>
        </div>
    );
}
