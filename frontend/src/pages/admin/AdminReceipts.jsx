import { useEffect, useState } from "react";
import api from "../../services/api";
import "./AdminReceipts.css";

function money(v){ const n=Number(v||0); return `Q ${n.toFixed(2)}`; }
function fmt(d){ try{ return new Date(d).toLocaleString(); }catch{ return d||""; } }

export default function AdminReceipts(){
    const [list,setList]=useState([]);
    const [loading,setLoading]=useState(true);
    const [err,setErr]=useState("");

    async function load(){
        setLoading(true); setErr("");
        try{
        const r = await api.get("/pagos/admin/pendientes");
        setList(Array.isArray(r.data)?r.data:[]);
        }catch(e){
        setErr(e?.response?.data?.detail || "No se pudieron cargar los comprobantes.");
        }finally{ setLoading(false); }
    }
    useEffect(()=>{ load(); },[]);

    async function act(id, estado){
        const nota = estado==="rechazado" ? prompt("Motivo del rechazo (opcional):","") : "";
        try{
        await api.patch(`/pagos/${id}`, null, { params: { estado, nota }});
        await load();
        alert(estado==="aprobado" ? "Comprobante aprobado y pedido movido a 'en_proceso'." : "Comprobante rechazado.");
        }catch(e){
        alert(e?.response?.data?.detail || "Acción no realizada.");
        }
    }

    return (
        <div className="ar-wrap">
        <h3>Comprobantes pendientes</h3>
        <div className="muted">Aprueba o rechaza los comprobantes enviados por clientes.</div>

        {err && <div className="admin-error">{err}</div>}
        {loading ? <div className="muted" style={{marginTop:10}}>Cargando…</div> : (
            !list.length ? <div className="muted" style={{marginTop:10}}>No hay comprobantes pendientes.</div> :
            <table className="ar-table">
            <thead>
                <tr>
                <th>ID</th><th>Pedido</th><th>Usuario</th><th>Método</th><th>Monto</th><th>Referencia</th><th>Fecha</th><th>Archivo</th><th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {list.map(c=>(
                <tr key={c.id}>
                    <td>#{c.id}</td>
                    <td>#{c.pedido_id}</td>
                    <td>{c.usuario_id}</td>
                    <td>{c.metodo || "—"}</td>
                    <td>{c.monto != null ? money(c.monto) : "—"}</td>
                    <td>{c.referencia || "—"}</td>
                    <td>{fmt(c.subido_en)}</td>
                    <td><a href={c.url} target="_blank" rel="noreferrer">Ver</a></td>
                    <td className="ar-actions">
                    <button className="btn ok" onClick={()=>act(c.id,"aprobado")}>Aprobar</button>
                    <button className="btn bad" onClick={()=>act(c.id,"rechazado")}>Rechazar</button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        )}
        </div>
    );
    }