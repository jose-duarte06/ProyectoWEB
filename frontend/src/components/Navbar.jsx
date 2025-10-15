import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Navbar() {
    const { user, logout } = useAuth();
    const { count } = useCart();
    const nav = useNavigate();

    const onLogout = () => { logout(); nav("/"); };

    /*function onLogout() {
        logout();
        nav("/");
    }*/

    return (
        <nav style={{
        display: "flex", gap: 12, padding: "12px 20px",
        borderBottom: "1px solid #eee", alignItems: "center"
        }}>
        <Link to="/productos">Productos</Link>
        <Link to="/carrito">Carrito ({count}) </Link>
        {/*link visible solo para usuarios logueados*/}
        {user && <Link to="/pedidos">Mis pedidos</Link>}
        {/*solo para administradores*/}
        {user?.rol === "administrador" && <Link to="/admin">Admin</Link>}
        <div style={{ marginLeft: "auto" }}>
            {user ? (
            <>
                <span style={{ marginRight: 12 }}>
                {user.nombre} ({user.rol})
                </span>
                <button onClick={onLogout}>Cerrar Sesion</button>
            </>
            ) : <span>Invitado</span>}
        </div>
        </nav>
    );
}
