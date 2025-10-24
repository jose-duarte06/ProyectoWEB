import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Navbar() {
    const loc = useLocation();

    if (loc.pathname.startsWith("/admin")) return null;

    const { user, logout } = useAuth();
    const { count } = useCart();
    const nav = useNavigate();

    const onLogout = () => { logout(); nav("/"); };

    return (
        <nav style={{
        display: "flex", gap: 12, padding: "12px 20px",
        borderBottom: "1px solid #eee", alignItems: "center"
        }}>
        <Link to="/productos">Productos</Link>
        <Link to="/carrito">Carrito ({count})</Link>
        {user && <Link to="/pedidos">Mis pedidos</Link>}
        {user?.rol === "administrador" && <Link to="/admin">Admin</Link>}
        {user && <Link to="/support">Soporte</Link>}
        <div style={{ marginLeft: "auto" }}>
            {user ? (
            <>
                <span style={{ marginRight: 12 }}>
                {user.nombre} ({user.rol})
                </span>
                <button onClick={onLogout}>Cerrar Sesión</button>
            </>
            ) : <span>Invitado</span>}
        </div>
        </nav>
    );
}