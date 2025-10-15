import { createContext, useContext, useMemo, useState } from "react";

const CartCtx = createContext();

export function CartProvider({ children }) {
    const [items, setItems] = useState([]); // [{id, nombre, precio, imagen_url, qty}]

    const add = (p, qty = 1) => {
        setItems((cur) => {
        const i = cur.findIndex(x => x.id === p.id);
        if (i >= 0) {
            const copy = [...cur];
            copy[i] = { ...copy[i], qty: copy[i].qty + qty };
            return copy;
        }
        return [...cur, { ...p, qty }];
        });
    };

    const setQty = (id, qty) => {
        if (qty <= 0) return remove(id);
        setItems((cur) => cur.map(x => x.id === id ? { ...x, qty } : x));
    };

    const remove = (id) => setItems((cur) => cur.filter(x => x.id !== id));
    const clear = () => setItems([]);

    const total = useMemo(() => items.reduce((s, x) => s + x.precio * x.qty, 0), [items]);
    const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);

    return (
        <CartCtx.Provider value={{ items, add, setQty, remove, clear, total, count }}>
        {children}
        </CartCtx.Provider>
    );
}

export const useCart = () => useContext(CartCtx);
