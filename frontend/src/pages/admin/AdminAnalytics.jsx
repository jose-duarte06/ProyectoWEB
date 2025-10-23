import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");

    async function load() {
        setErr("");
        try {
        const r = await api.get("/analytics/resumen");
        setData(r.data);
        } catch (e) {
        const m = e?.response?.data?.detail || "No se pudo cargar la analítica.";
        setErr(m);
        }
    }

    useEffect(() => { load(); }, []);

    if (err) return <div style={{color:"crimson"}}>{err}</div>;
    if (!data) return <div>Cargando analítica…</div>;

    const { kpis, pedidos_por_estado, top_keywords } = data;

    const Kpi = ({label, value}) => (
        <div style={{
        border:"1px solid #eee", borderRadius:12, padding:16, minWidth:160
        }}>
        <div style={{fontSize:12, opacity:.7}}>{label}</div>
        <div style={{fontSize:22, fontWeight:700, marginTop:6}}>
            {label === "Ventas totales" ? `$ ${value.toFixed(2)}` : value}
        </div>
        </div>
    );

    return (
        <div style={{display:"grid", gap:16}}>
        <h3>Analítica</h3>

        <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
            <Kpi label="Usuarios" value={kpis.usuarios}/>
            <Kpi label="Productos" value={kpis.productos}/>
            <Kpi label="Pedidos" value={kpis.pedidos}/>
            <Kpi label="Ventas totales" value={kpis.ventas_totales}/>
            <Kpi label="Chats" value={kpis.chats}/>
            <Kpi label="Mensajes" value={kpis.mensajes}/>
        </div>

        <div style={{display:"grid", gap:8}}>
            <h4>Pedidos por estado</h4>
            <table style={{borderCollapse:"collapse", width:"100%"}}>
            <thead>
                <tr>
                <th style={{textAlign:"left", borderBottom:"1px solid #eee", padding:8}}>Estado</th>
                <th style={{textAlign:"right", borderBottom:"1px solid #eee", padding:8}}>Cantidad</th>
                </tr>
            </thead>
            <tbody>
                {pedidos_por_estado.map((r,i)=>(
                <tr key={i}>
                    <td style={{padding:8}}>{r.estado}</td>
                    <td style={{padding:8, textAlign:"right"}}>{r.cantidad}</td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        <div style={{display:"grid", gap:8}}>
            <h4>Top 10 keywords (chat)</h4>
            <table style={{borderCollapse:"collapse", width:"100%"}}>
            <thead>
                <tr>
                <th style={{textAlign:"left", borderBottom:"1px solid #eee", padding:8}}>Keyword</th>
                <th style={{textAlign:"right", borderBottom:"1px solid #eee", padding:8}}>Count</th>
                </tr>
            </thead>
            <tbody>
            {top_keywords.map((r,i)=>(
                <tr key={i}>
                <td style={{padding:8}}>{r.keyword}</td>
                <td style={{padding:8, textAlign:"right"}}>{r.count}</td>
                </tr>
            ))}
            </tbody>
            </table>
        </div>
        </div>
    );
}
