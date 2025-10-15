import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthCtx = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
    
    useEffect(() => {
        const t = localStorage.getItem("token");
        if (!t) { setReady(true); return; }
        api.get("/usuarios/perfil")
        .then(r => setUser(r.data))
        .catch(() => setUser(null))
        .finally(() => setReady(true));
    }, []);

    async function login(correo, contrasena) {
        const r = await api.post("/usuarios/login", { correo, contrasena });
        localStorage.setItem("token", r.data.access_token);
        const me = await api.get("/usuarios/perfil");
        setUser(me.data);
    }

    function logout() {
        localStorage.removeItem("token");
        setUser(null);
    }

    return (
        <AuthCtx.Provider value={{ user, ready, login, logout }}>
        {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
