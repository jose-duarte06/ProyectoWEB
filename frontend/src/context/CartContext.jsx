import { createContext, useContext, useEffect, useMemo, useState } from "react";

const KEY = "cart";
const CartCtx = createContext();

function readCart() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
    }
    function writeCart(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    // Notificar a toda la app (badges, páginas, etc.)
    window.dispatchEvent(new Event("cart-updated"));
    }

    export function CartProvider({ children }) {
    const [items, setItems] = useState(readCart());

    // Hidratar y escuchar cambios externos (otras pestañas o “addToCart”)
    useEffect(() => {
        const sync = () => setItems(readCart());
        // inicial por si el provider se monta después de agregar
        setItems(readCart());
        window.addEventListener("storage", sync);
        window.addEventListener("cart-updated", sync);
        return () => {
        window.removeEventListener("storage", sync);
        window.removeEventListener("cart-updated", sync);
        };
    }, []);

    // ---- acciones ----
    function add(producto, qty = 1) {
        setItems((prev) => {
        const next = [...prev];
        const i = next.findIndex((x) => x.id === producto.id);
        if (i >= 0) next[i] = { ...next[i], qty: next[i].qty + qty };
        else
            next.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio || 0),
            imagen_url: producto.imagen_url || "",
            qty: qty,
            });
        writeCart(next);
        return next;
        });
    }

    function remove(id) {
        setItems((prev) => {
        const next = prev.filter((x) => x.id !== id);
        writeCart(next);
        return next;
        });
    }

    function setQty(id, qty) {
        const n = Number(qty || 0);
        setItems((prev) => {
        let next = [...prev];
        const i = next.findIndex((x) => x.id === id);
        if (i < 0) return prev;
        if (n <= 0) next = next.filter((x) => x.id !== id);
        else next[i] = { ...next[i], qty: n };
        writeCart(next);
        return next;
        });
    }

    function clear() {
        writeCart([]);
        setItems([]);
    }

    const count = useMemo(() => items.reduce((a, x) => a + x.qty, 0), [items]);
    const total = useMemo(
        () => items.reduce((a, x) => a + x.qty * Number(x.precio || 0), 0),
        [items]
    );

    return (
        <CartCtx.Provider value={{ items, add, remove, setQty, clear, total, count }}>
        {children}
        </CartCtx.Provider>
    );
    }

export const useCart = () => useContext(CartCtx);