// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthCtx = createContext();

function applyToken(tok) {
    if (tok) {
        api.defaults.headers.common["Authorization"] = `Bearer ${tok}`;
        localStorage.setItem("token", tok);
    } else {
        delete api.defaults.headers.common["Authorization"];
        localStorage.removeItem("token");
    }
}

    export function AuthProvider({ children }) {
    const [user, setUser]   = useState(null);
    const [token, setToken] = useState("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("token") || "";
        if (!saved) { setReady(true); return; }
        applyToken(saved);
        setToken(saved);
        api.get("/usuarios/perfil")
        .then(r => setUser(r.data))
        .catch(() => { applyToken(""); setToken(""); setUser(null); })
        .finally(() => setReady(true));
    }, []);

    async function login(correo, contrasena) {
        // 1) obtener token
        const r = await api.post("/usuarios/login", { correo, contrasena });
        const newToken = r.data.access_token;

        // 2) aplicarlo de inmediato al header + storage
        applyToken(newToken);
        setToken(newToken);

        // 3) pedir perfil (una única vez)
        const me = await api.get("/usuarios/perfil");
        setUser(me.data);
        // ready ya está en true por el flujo normal; si quieres forzar:
        setReady(true);
    }

    function logout() {
        applyToken("");
        setToken("");
        setUser(null);
    }

    return (
        <AuthCtx.Provider value={{ user, ready, token, login, logout }}>
        {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
