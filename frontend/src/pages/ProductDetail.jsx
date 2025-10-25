import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import QuickNav from "../components/QuickNav.jsx";
import "./ProductDetail.css";

const FALLBACK_IMG = "/imagenes/placeholder-producto.jpg";

export default function ProductDetail() {
    const { id } = useParams();
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [err, setErr]       = useState("");
    const [p, setP]           = useState(null);
    const [qty, setQty]       = useState(1);

    // comentarios (solo front)
    const [comments, setComments] = useState([]);
    const [cName, setCName]   = useState("");
    const [cStars, setCStars] = useState(5);
    const [cText, setCText]   = useState("");

    useEffect(() => {
        (async () => {
        setLoading(true);
        setErr("");
        try {
            const r = await api.get(`/productos/${id}`);
            setP(r.data);
        } catch (e) {
            setErr(e?.response?.data?.detail || "No se pudo cargar el producto.");
        } finally {
            setLoading(false);
        }
        })();
    }, [id]);

    useEffect(() => {
        try {
        const raw = localStorage.getItem(`comments:${id}`);
        setComments(raw ? JSON.parse(raw) : []);
        } catch { setComments([]); }
    }, [id]);

    function saveComments(next) {
        setComments(next);
        try { localStorage.setItem(`comments:${id}`, JSON.stringify(next)); } catch {}
    }
    function addComment(e) {
        e.preventDefault();
        const name = cName.trim() || "Anónimo";
        const text = cText.trim();
        if (!text) return;
        const next = [{ name, stars: Math.max(1, Math.min(5, Number(cStars) || 5)), text, ts: Date.now() }, ...comments];
        saveComments(next);
        setCName(""); setCStars(5); setCText("");
    }

    const gallery = useMemo(() => {
        if (!p) return [FALLBACK_IMG];
        const list = [];
        if (p.imagen_url) list.push(p.imagen_url);
        const imgs = Array.isArray(p.imagenes)
        ? p.imagenes
        : typeof p.imagenes === "string"
        ? p.imagenes.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
        imgs.forEach((u) => { if (u && !list.includes(u)) list.push(u); });
        if (!list.length) list.push(FALLBACK_IMG);
        return list;
    }, [p]);

    const [mainIdx, setMainIdx] = useState(0);
    useEffect(() => setMainIdx(0), [gallery.length]);

    function addToCart() {
        if (!p) return;
        try {
        const raw = localStorage.getItem("cart");
        const cart = raw ? JSON.parse(raw) : [];
        const idx = cart.findIndex((it) => it.id === p.id);
        const nqty = Math.max(1, Math.min(99, Number(qty) || 1));
        if (idx >= 0) cart[idx].qty += nqty;
        else cart.push({ id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: gallery[0], qty: nqty });
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cart-updated"));
        alert("Producto agregado al carrito.");
        } catch { alert("No se pudo agregar al carrito."); }
    }

    if (loading) return <div className="pd-wrap"><div className="pd-loading">Cargando…</div></div>;
    if (err)     return <div className="pd-wrap"><div className="pd-error">{err}</div></div>;
    if (!p)      return <div className="pd-wrap"><div className="pd-error">Producto no encontrado.</div></div>;

    return (
        <div className="pd-wrap">
        <QuickNav active="productos" showBack />

        <div className="pd-card">
            {/* LEFT: galería */}
            <div className="pd-gallery">
            <div
                className="pd-main"
                style={{ backgroundImage: `url('${gallery[mainIdx]}')` }}
                title={p.nombre}
            />
            {gallery.length > 1 && (
                <div className="pd-thumbs">
                {gallery.map((src, i) => (
                    <button
                    key={i}
                    className={`pd-thumb ${i === mainIdx ? "active" : ""}`}
                    style={{ backgroundImage: `url('${src}')` }}
                    onClick={() => setMainIdx(i)}
                    aria-label={`imagen ${i + 1}`}
                    />
                ))}
                </div>
            )}
            </div>

            {/* RIGHT: info */}
            <div className="pd-info">
            <button className="pd-back" onClick={() => nav(-1)}>← Volver</button>
            <h1 className="pd-title">{p.nombre}</h1>
            <div className="pd-price">Q {Number(p.precio || 0).toFixed(2)}</div>

            <div className="pd-desc">{p.descripcion || "Sin descripción."}</div>

            <div className="pd-buy">
                <label className="pd-qty">
                Cantidad
                <input
                    type="number"
                    min={1}
                    max={99}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                />
                </label>
                <button className="btn primary pd-add" onClick={addToCart}>
                Agregar al carrito
                </button>
            </div>

            {p.especificaciones && (
                <div className="pd-specs">
                <h3>Especificaciones</h3>
                <pre>{p.especificaciones}</pre>
                </div>
            )}
            </div>
        </div>

        {/* COMENTARIOS */}
        <section className="pd-comments">
            <h2>Opiniones</h2>

            <form className="pd-cform" onSubmit={addComment}>
            <input
                className="input"
                placeholder="Tu nombre (opcional)"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
            />
            <select
                className="input"
                value={cStars}
                onChange={(e) => setCStars(e.target.value)}
                title="Calificación"
            >
                <option value={5}>★★★★★</option>
                <option value={4}>★★★★☆</option>
                <option value={3}>★★★☆☆</option>
                <option value={2}>★★☆☆☆</option>
                <option value={1}>★☆☆☆☆</option>
            </select>
            <textarea
                className="input"
                placeholder="Escribe tu opinión…"
                value={cText}
                onChange={(e) => setCText(e.target.value)}
                rows={3}
            />
            <button className="btn primary" type="submit">Publicar</button>
            </form>

            {!comments.length ? (
            <div className="pd-empty">Aún no hay comentarios.</div>
            ) : (
            <ul className="pd-clist">
                {comments.map((c, i) => (
                <li key={i} className="pd-com">
                    <div className="pd-com-head">
                    <b>{c.name}</b>
                    <span className="pd-stars">{renderStars(c.stars)}</span>
                    <span className="pd-date">{new Date(c.ts).toLocaleString()}</span>
                    </div>
                    <p>{c.text}</p>
                </li>
                ))}
            </ul>
            )}
        </section>
        </div>
    );
    }

    function renderStars(n = 5) {
    const s = Math.max(1, Math.min(5, Number(n) || 5));
    return "★".repeat(s) + "☆".repeat(5 - s);
}