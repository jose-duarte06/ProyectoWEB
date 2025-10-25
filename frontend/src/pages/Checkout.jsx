import api from "../services/api";
import { useCart } from "../context/CartContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import QuickNav from "../components/QuickNav.jsx";
import "./Checkout.css";

export default function Checkout() {
    const { items, total, clear } = useCart();
    const { user } = useAuth();
    const nav = useNavigate();

    const disabled = !items.length || !user;

    async function placeOrder() {
        try {
        const detalles = items.map((x) => ({
            producto_id: x.id,
            cantidad: x.qty,
            precio_unitario: x.precio,
        }));
        await api.post("/pedidos", { detalles, total });
        clear();
        nav("/pedidos");
        } catch {
        alert("No se pudo crear el pedido. Revisa tu sesión.");
        }
    }

    if (!items.length)
        return (
        <div className="co-wrap">
            <QuickNav active="carrito" showBack />
            <div className="co-empty">
            <p>Tu carrito está vacío.</p>
            <Link className="btn" to="/productos">Ir al catálogo</Link>
            </div>
        </div>
        );

    return (
        <div className="co-wrap">
        <QuickNav active="carrito" showBack />

        <header className="co-head">
            <h2>Confirmar compra</h2>
            <span className="muted">Revisa tu orden y confirma</span>
        </header>

        <div className="co-grid">
            <section className="co-list">
            {items.map((x) => (
                <article key={x.id} className="co-row">
                <div
                    className="co-img"
                    style={{
                    backgroundImage: `url('${(x.imagen_url || "").trim() || "/imagenes/placeholder-producto.jpg"}')`,
                    }}
                    title={x.nombre}
                />
                <div className="co-info">
                    <div className="co-name">{x.nombre}</div>
                    <div className="co-meta">
                    <span>Precio: Q {Number(x.precio).toFixed(2)}</span>
                    <span>•</span>
                    <span>Cant: {x.qty}</span>
                    </div>
                </div>
                <div className="co-line">Q {(x.precio * x.qty).toFixed(2)}</div>
                </article>
            ))}
            </section>

            <aside className="co-summary">
            <h3>Resumen</h3>
            <div className="sum-row">
                <span>Subtotal</span>
                <b>Q {total.toFixed(2)}</b>
            </div>
            <div className="sum-row">
                <span>Envío</span>
                <span className="muted">A convenir</span>
            </div>
            <div className="sum-total">
                <span>Total</span>
                <b>Q {total.toFixed(2)}</b>
            </div>

            {!user && <div className="co-alert">Debes iniciar sesión para confirmar tu pedido.</div>}

            <button className="btn primary wfull" disabled={disabled} onClick={placeOrder}>
                Confirmar pedido
            </button>
            <Link className="btn ghost wfull" to="/carrito">Volver al carrito</Link>
            </aside>
        </div>
        </div>
    );
}