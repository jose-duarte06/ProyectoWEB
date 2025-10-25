import { NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import "./QuickNav.css";

export default function QuickNav({ active, showBack = false }) {
    const nav = useNavigate();
    // si no existe el CartContext no rompe
    let count = 0;
    try {
        const { items } = useCart();
        count = (items || []).reduce((s, it) => s + (it.qty || 0), 0);
    } catch (_) {}

    const Tab = ({ to, k, children }) => (
        <NavLink to={to} className={`qtab ${active === k ? "active" : ""}`}>
        {children}
        {k === "carrito" && count > 0 && <span className="badge">{count}</span>}
        </NavLink>
    );

    return (
        <>
        <div className="quick-nav">
            <Tab to="/productos" k="productos">Productos</Tab>
            <Tab to="/carrito"   k="carrito">Carrito</Tab>
            <Tab to="/pedidos"   k="pedidos">Mis pedidos</Tab>
            <Tab to="/support"   k="support">Soporte</Tab>
        </div>

        {showBack && (
            <div className="quick-back">
            <button className="btn ghost" onClick={() => nav(-1)}>← Volver</button>
            <button className="btn" onClick={() => nav("/productos")}>Ir al catálogo</button>
            </div>
        )}
        </>
    );
}