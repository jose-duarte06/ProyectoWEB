import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import QuickNav from "../components/QuickNav.jsx";
import "./ProductList.css";

const FALLBACK_IMG = "/imagenes/placeholder-producto.jpg";

export default function ProductList() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [products, setProducts] = useState([]);
    const [q, setQ] = useState("");
    const nav = useNavigate();

    useEffect(() => {
        (async () => {
        setLoading(true);
        setErr("");
        try {
            const r = await api.get("/productos");
            setProducts(Array.isArray(r.data) ? r.data : []);
        } catch (e) {
            setErr(e?.response?.data?.detail || "No se pudieron cargar los productos.");
        } finally {
            setLoading(false);
        }
        })();
    }, []);

    const list = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return products;
        return products.filter((p) =>
        [p.nombre, p.descripcion].some((t) => (t || "").toLowerCase().includes(term))
        );
    }, [q, products]);

    function addToCart(p) {
        try {
        const raw = localStorage.getItem("cart");
        const cart = raw ? JSON.parse(raw) : [];
        const idx = cart.findIndex((it) => it.id === p.id);
        if (idx >= 0) cart[idx].qty += 1;
        else cart.push({ id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url, qty: 1 });
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cart-updated"));
        alert("Producto agregado al carrito.");
        } catch {
        alert("No se pudo agregar al carrito.");
        }
    }

    return (
        <div className="catalog-page">
        <QuickNav active="productos" />

        {/* HERO */}
        <section className="hero">
            <div className="hero-overlay" />
            <div className="hero-inner">
            <div className="hero-badge">Novedades</div>
            <h1 className="hero-title">Accesorios para <span>Motocicleta</span></h1>
            <p className="hero-sub">Calidad y rendimiento para tu próxima ruta.</p>
            <button className="btn hero-btn" onClick={() => document.getElementById("grid")?.scrollIntoView({ behavior: "smooth" })}>
                Ver catálogo
            </button>
            </div>
        </section>

        {/* TOOLS */}
        <section className="tools">
            <div className="tools-left">
            <h3 className="tools-title">Catálogo</h3>
            <span className="tools-count">{list.length} resultado(s)</span>
            </div>
            <div className="tools-right">
            <input className="input search" placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
        </section>

        {err && <div className="alert error">{err}</div>}

        {loading ? (
            <div className="loading">Cargando productos…</div>
        ) : !list.length ? (
            <div className="empty">No hay productos para mostrar.</div>
        ) : (
            <section id="grid" className="grid">
            {list.map((p) => (
                <article key={p.id} className="card">
                <div
                    className="card-img"
                    style={{ backgroundImage: `url('${(p.imagen_url || "").trim() || FALLBACK_IMG}')` }}
                    onClick={() => nav(`/productos/${p.id}`)}
                    title={p.nombre}
                />
                <div className="card-body">
                    <div className="card-title" title={p.nombre}>{p.nombre}</div>
                    <div className="card-price">Q {Number(p.precio || 0).toFixed(2)}</div>
                </div>
                <div className="card-actions">
                    <button className="btn primary" onClick={() => addToCart(p)}>Agregar</button>
                    <button className="btn" onClick={() => nav(`/productos/${p.id}`)}>Ver</button>
                </div>
                </article>
            ))}
            </section>
        )}
        </div>
    );
}