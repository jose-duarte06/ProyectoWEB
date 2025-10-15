import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext.jsx";

export default function ProductDetail(){
    const { id } = useParams();
    const [p,setP] = useState(null);
    const { add } = useCart();

    useEffect(()=>{
        api.get(`/productos/${id}`).then(r=>setP(r.data)).catch(()=>setP(null));
    },[id]);

    if(!p) return <p>Cargando...</p>;

    return (
        <div style={{ display:"grid", gap:16, gridTemplateColumns:"1fr 1fr" }}>
        <img src={p.imagen_url} alt={p.nombre} style={{ width:"100%", borderRadius:12 }}/>
        <div>
            <h2>{p.nombre}</h2>
            <p>Q {p.precio}</p>
            <p>{p.descripcion}</p>
            <button onClick={()=>add(p,1)}>Agregar al carrito</button>
        </div>
        </div>
    );
}
