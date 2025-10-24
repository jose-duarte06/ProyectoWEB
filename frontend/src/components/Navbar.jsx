import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./Navbar.css";

export default function Navbar() {
    const { user, logout } = useAuth();
    const nav = useNavigate();
    const loc = useLocation();

    const hideOn = []; 
    if (hideOn.includes(loc.pathname)) return null;

    const onLogout = () => {
        logout();
        nav("/", { replace: true });
    };

    return (
        <header className="topbar">
        <div className="topbar-left">
            <Link to={user?.rol === "administrador" ? "/admin?tab=analytics" : "/productos"} className="brand">
            <img src="/imagenes/LogoMotekaRacing.png" alt="Moteka" />
            </Link>
        </div>

        <nav className="topbar-right">
            {user ? (
            <>
                <span className="userchip">
                {user.nombre}
                <span className="role">{user.rol}</span>
                </span>
                <button className="btn-logout" onClick={onLogout} title="Cerrar sesión">
                Cerrar Sesión
                </button>
            </>
            ) : (
            <Link className="btn-login" to="/">Iniciar sesión</Link>
            )}
        </nav>
        </header>
    );
}