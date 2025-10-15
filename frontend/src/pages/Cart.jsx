import { useCart } from "../context/CartContext.jsx";
import { Link, useNavigate } from "react-router-dom";

export default function Cart(){
    const { items, setQty, remove, total } = useCart();
    const nav = useNavigate();

    if(!items.length) return (
        <div>
        <h2>Carrito</h2>
        <p>Tu carrito está vacío.</p>
        <Link to="/productos"><button>Ir a comprar</button></Link>
        </div>
    );

    return (
        <div>
        <h2>Carrito</h2>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
            <tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr>
            </thead>
            <tbody>
            {items.map(x=>(
                <tr key={x.id}>
                <td>{x.nombre}</td>
                <td>Q {x.precio}</td>
                <td>
                    <input
                    type="number"
                    min={1}
                    value={x.qty}
                    onChange={e=>setQty(x.id, parseInt(e.target.value||"1",10))}
                    style={{ width:60 }}
                    />
                </td>
                <td>Q {(x.precio * x.qty).toFixed(2)}</td>
                <td><button onClick={()=>remove(x.id)}>Quitar</button></td>
                </tr>
            ))}
            </tbody>
        </table>
        <h3>Total: Q {total.toFixed(2)}</h3>
        <button onClick={()=>nav("/checkout")}>Proceder al pago</button>
        </div>
    );
}

