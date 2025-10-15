import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

api.interceptors.request.use(cfg => {
    const t = localStorage.getItem("token");
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
});

// si el backend devuelve 401, cierra sesión y manda a login
api.interceptors.response.use(
    r => r,
    err => {
        if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        // muestra un aviso con toast
        window.location.href = "/"; // vuelve a login
        }
        return Promise.reject(err);
    }
);

export default api;
