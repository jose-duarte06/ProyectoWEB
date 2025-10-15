import api from "../services/api";
import { useCart } from "../context/CartContext.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Checkout(){
    const { items, total, clear } = useCart();
    const { user } = useAuth();
    const nav = useNavigate();
    const disabled = !items.length || !user; // pedimos login para pedir

    async function placeOrder(){
        try{
        const detalles = items.map(x => ({
            producto_id: x.id,
            cantidad: x.qty,
            precio_unitario: x.precio
        }));
        await api.post("/pedidos", { detalles, total });
        clear();
        nav("/pedidos"); // luego creamos esta pantalla
        }catch{
        alert("No se pudo crear el pedido. Revisa tu sesión y el backend.");
        }
    }

    if(!items.length) return <p>Carrito vacío.</p>;

    return (
        <div>
        <h2>Checkout</h2>
        <ul>
            {items.map(x=>(
            <li key={x.id}>{x.nombre} x{x.qty} — Q {(x.precio * x.qty).toFixed(2)}</li>
            ))}
        </ul>
        <h3>Total: Q {total.toFixed(2)}</h3>
        {!user && <p style={{color:"crimson"}}>Inicia sesión para continuar.</p>}
        <button disabled={disabled} onClick={placeOrder}>Confirmar pedido</button>
        </div>
    );
}
