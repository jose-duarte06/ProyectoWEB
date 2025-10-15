import { useEffect, useState } from "react";
import api from "../services/api";

export default function Orders(){
    const [orders,setOrders] = useState([]);
    const [err,setErr] = useState("");

    useEffect(()=>{
        api.get("/pedidos/mis-pedidos")
        .then(r=>setOrders(r.data))
        .catch(()=>setErr("No se pudieron cargar tus pedidos."));
    },[]);

    return (
        <div>
        <h2>Mis pedidos</h2>
        {err && <p style={{color:"crimson"}}>{err}</p>}
        <ul>
            {orders.map(o=>(
            <li key={o.id}>#{o.id} — {o.estado} — Q {o.total}</li>
            ))}
        </ul>
        </div>
    );
}
