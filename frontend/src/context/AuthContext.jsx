// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthCtx = createContext();

function applyToken(tok) {
    if (tok) {
        api.defaults.headers.common["Authorization"] = `Bearer ${tok}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
    }

    export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // lee de localStorage O de sessionStorage
        const saved =
        localStorage.getItem("token") || sessionStorage.getItem("token") || "";

        if (!saved) {
        setReady(true);
        return;
        }

        applyToken(saved);
        setToken(saved);

        api
        .get("/usuarios/perfil")
        .then((r) => setUser(r.data))
        .catch(() => {
            applyToken("");
            setToken("");
            setUser(null);
            // limpia ambos por si acaso
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
        })
        .finally(() => setReady(true));
    }, []);

    async function login(correo, contrasena, remember = true) {
        // 1) obtener token
        const r = await api.post("/usuarios/login", { correo, contrasena });
        const newToken = r.data.access_token;

        // 2) setear header
        applyToken(newToken);
        setToken(newToken);

        // 3) persistencia según remember (true -> localStorage ; false -> sessionStorage)
        if (remember) {
        localStorage.setItem("token", newToken);
        sessionStorage.removeItem("token");
        } else {
        sessionStorage.setItem("token", newToken);
        localStorage.removeItem("token");
        }

        // 4) pedir perfil
        const me = await api.get("/usuarios/perfil");
        setUser(me.data);
        setReady(true);
    }

    function logout() {
        applyToken("");
        setToken("");
        setUser(null);
        // limpia ambos
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
    }

    return (
        <AuthCtx.Provider value={{ user, ready, token, login, logout }}>
        {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);