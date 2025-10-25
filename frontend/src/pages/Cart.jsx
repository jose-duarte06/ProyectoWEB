import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import QuickNav from "../components/QuickNav.jsx";
import { useCart } from "../context/CartContext.jsx";
import "./Cart.css";

export default function Cart() {
    const { items, setQty, remove, clear } = useCart();
    const nav = useNavigate();

    const total = useMemo(
        () => (items || []).reduce((s, it) => s + (it.precio || 0) * (it.qty || 0), 0),
        [items]
    );

    if (!items?.length) {
        return (
        <div className="cart-page">
            <QuickNav active="carrito" showBack />
            <h2>Tu carrito</h2>
            <div className="empty-card">
            <p>Tu carrito está vacío.</p>
            <button className="btn" onClick={() => nav("/productos")}>Ir al catálogo</button>
            </div>
        </div>
        );
    }

    return (
        <div className="cart-page">
        <QuickNav active="carrito" showBack />

        <h2>Tu carrito</h2>
        <div className="cart-grid">
            <div className="cart-list">
            {items.map((it) => (
                <div key={it.id} className="cart-row">
                <div className="cart-info">
                    <div className="cart-name">{it.nombre}</div>
                    <div className="cart-price">Q {Number(it.precio || 0).toFixed(2)}</div>
                </div>
                <div className="cart-qty">
                    <button className="btn ghost" onClick={() => setQty(it.id, Math.max(1, (it.qty || 1) - 1))}>-</button>
                    <input
                    className="qty-input"
                    type="number"
                    min="1"
                    value={it.qty}
                    onChange={(e) => setQty(it.id, Math.max(1, parseInt(e.target.value || "1", 10)))}
                    />
                    <button className="btn ghost" onClick={() => setQty(it.id, (it.qty || 1) + 1)}>+</button>
                    <button className="btn danger" onClick={() => remove(it.id)}>Quitar</button>
                </div>
                </div>
            ))}
            <div className="cart-actions">
                <button className="btn ghost" onClick={() => clear()}>Vaciar carrito</button>
                <button className="btn" onClick={() => nav("/productos")}>Seguir comprando</button>
            </div>
            </div>

            <aside className="cart-summary">
            <div className="sum-row">
                <span>Total</span>
                <b>Q {total.toFixed(2)}</b>
            </div>
            <button className="btn primary" onClick={() => nav("/checkout")}>Proceder al pago</button>
            </aside>
        </div>
        </div>
    );
}