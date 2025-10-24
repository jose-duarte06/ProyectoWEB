import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../services/api";
import "./AdminHome.css";

/*
 * Esta página:
 * - Saluda al admin por su nombre
 * - Muestra KPIs (usuarios, productos, pedidos abiertos, ventas, mensajes)
 * - Muestra comparativa de ingresos (semana vs semana previa) si el endpoint existe
 * - Lista pedidos con filtro por estado (si /pedidos está disponible)
 *
 * Endpoints usados (best-effort):
 *   /analytics/resumen   -> KPIs + pedidos_por_estado
 *   /analytics/ingresos?days=14  (opcional) -> [{fecha, total}] últimos 14 días
 *   /pedidos             (opcional) -> lista de pedidos para “Órdenes”
 */

export default function AdminHome() {
    const { user } = useAuth();

    const [kpis, setKpis] = useState(null);
    const [pedidosByEstado, setPedidosByEstado] = useState([]);
    const [ingresos, setIngresos] = useState([]); // últimos 14 días (opcional)
    const [orders, setOrders] = useState([]);     // (opcional)
    const [estadoFiltro, setEstadoFiltro] = useState("todos");
    const [err, setErr] = useState("");

    useEffect(() => {
        let mounted = true;

        async function load() {
        setErr("");
        try {
            const r = await api.get("/analytics/resumen");
            if (!mounted) return;
            setKpis(r.data?.kpis || null);
            setPedidosByEstado(r.data?.pedidos_por_estado || []);
        } catch (e) {
            if (!mounted) return;
            setErr("No se pudo cargar la analítica.");
        }

        // BEST-EFFORT: ingresos 14 días (si existe el endpoint en tu backend)
        try {
            const r2 = await api.get("/analytics/ingresos", { params: { days: 14 } });
            if (mounted) setIngresos(Array.isArray(r2.data) ? r2.data : []);
        } catch { /* silencioso */ }

        // BEST-EFFORT: pedidos para listado inferior
        try {
            const r3 = await api.get("/pedidos");
            if (mounted) setOrders(Array.isArray(r3.data) ? r3.data : []);
        } catch { /* silencioso */ }
        }

        load();
        return () => { mounted = false; };
    }, []);

    // Pedidos abiertos (si vienen agregados por estado)
    const abiertos = useMemo(() => {
        const f = pedidosByEstado.find(x => (x.estado || "").toLowerCase() === "abierto");
        return f ? f.cantidad : 0;
    }, [pedidosByEstado]);

    // Ventas de “hoy”: si tu backend aún no lo expone, mostramos ventas_totales como fallback
    const ventasHoyLabel = useMemo(() => {
        if (!kpis) return "";
        return kpis.ventas_hoy != null ? "Ventas de hoy" : "Ventas totales";
    }, [kpis]);

    const ventasHoyValue = useMemo(() => {
        if (!kpis) return 0;
        return kpis.ventas_hoy != null ? kpis.ventas_hoy : kpis.ventas_totales || 0;
    }, [kpis]);

    // Serie semanal vs semana anterior (si /analytics/ingresos existe)
    // Esperamos [{fecha:'YYYY-MM-DD', total:Number}, ...] 14 puntos
    const weekA = ingresos.slice(7, 14); // semana actual
    const weekB = ingresos.slice(0, 7);  // semana previa

    // Filtro de órdenes
    const ordersFiltradas = useMemo(() => {
        if (!orders.length) return [];
        if (estadoFiltro === "todos") return orders;
        return orders.filter(o => (o.estado || "").toLowerCase() === estadoFiltro);
    }, [orders, estadoFiltro]);

    return (
        <div className="admin-home">
        <div className="admin-home__header">
            <div>
            <h1>Panel de Control</h1>
            <p className="muted">
                Bienvenido{user?.nombre ? `, ${user.nombre}` : ""}. Aquí tienes un resumen del sistema.
            </p>
            </div>

            <div className="admin-home__actions">
            <Link className="btn ghost" to="/admin?tab=docs">Documentación</Link>
            <Link className="btn ghost" to="/admin?tab=pedidos">Gestionar pedidos</Link>
            <Link className="btn primary" to="/admin?tab=productos">Agregar producto</Link>
            </div>
        </div>

        {err && <div className="alert error">{err}</div>}

        {/* KPIs */}
        <div className="kpis">
            <KpiCard label="Usuarios (activos)" value={kpis?.usuarios ?? "..."} />
            <KpiCard label="Productos disponibles" value={kpis?.productos ?? "..."} />
            <KpiCard label="Pedidos abiertos" value={abiertos} />
            <KpiCard label={ventasHoyLabel} value={`Q ${Number(ventasHoyValue).toFixed(2)}`} />
            <KpiCard label="Mensajes" value={kpis?.mensajes ?? "..."} />
        </div>

        {/* Gráfica y Órdenes */}
        <div className="grid-2">
            <div className="panel">
            <div className="panel__title">Ingresos (semana vs semana anterior)</div>
            {weekA.length === 7 && weekB.length === 7 ? (
                <MiniAreaCompare
                a={weekA.map(x => x.total || 0)}
                b={weekB.map(x => x.total || 0)}
                labels={weekA.map(x => x.fecha?.slice(5) || "")}
                currency="Q"
                />
            ) : (
                <div className="empty">Aún no hay datos para la gráfica.</div>
            )}
            </div>

            <div className="panel">
            <div className="panel__title row">
                <span>Órdenes</span>
                <div className="right">
                <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
                    <option value="todos">Todos</option>
                    <option value="abierto">Abierto</option>
                    <option value="preparando">Preparando</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                </select>
                </div>
            </div>

            {ordersFiltradas.length ? (
                <table className="table">
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th className="right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {ordersFiltradas.slice(0, 10).map(o => (
                    <tr key={o.id}>
                        <td>{o.id}</td>
                        <td>{o.usuario_id ?? "-"}</td>
                        <td><span className={`badge b-${(o.estado || "desconocido").toLowerCase()}`}>{o.estado || "desconocido"}</span></td>
                        <td className="right">Q {Number(o.total || 0).toFixed(2)}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            ) : (
                <div className="empty">No hay órdenes para mostrar.</div>
            )}
            </div>
        </div>
        </div>
    );
    }

    /* ---------- componentes auxiliares ---------- */

    function KpiCard({ label, value }) {
    return (
        <div className="kpi">
        <div className="kpi__label">{label}</div>
        <div className="kpi__value">{value}</div>
        </div>
    );
    }

    /**
    * Pequeña “gráfica” comparativa sin librerías.
    * Dibuja 2 áreas simples usando SVG (7 puntos por serie).
    */
    function MiniAreaCompare({ a = [], b = [], labels = [], currency = "" }) {
    const w = 540, h = 220, pad = 24;
    const max = Math.max(1, ...a, ...b);
    const scaleX = i => pad + (i * (w - 2 * pad)) / (a.length - 1);
    const scaleY = v => h - pad - (v / max) * (h - 2 * pad);

    const toPath = (series) => {
        if (!series.length) return "";
        const pts = series.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" L ");
        return `M ${scaleX(0)},${h - pad} L ${pts} L ${scaleX(series.length - 1)},${h - pad} Z`;
        // área cerrada
    };

    const pathA = toPath(a);
    const pathB = toPath(b);

    return (
        <div className="mini-chart">
        <svg width={w} height={h}>
            {/* rejilla simple */}
            {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1={pad} x2={w - pad} y1={pad + t * (h - 2 * pad)} y2={pad + t * (h - 2 * pad)} className="grid" />
            ))}
            <path d={pathB} className="area area-b" />
            <path d={pathA} className="area area-a" />
            {/* labels inferiores */}
            {labels.map((lb, i) => (
            <text key={i} x={scaleX(i)} y={h - 4} textAnchor="middle" className="tick">{lb}</text>
            ))}
        </svg>
        <div className="legend">
            <span className="dot a" /> Semana actual
            <span className="dot b" /> Semana previa
        </div>
        </div>
    );
}