import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "./AdminAnalytics.css";

export default function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");

    useEffect(() => {
        (async () => {
        try {
            // Forzamos el endpoint estable que ya tienes y adaptamos el payload
            const r = await api.get("/analytics/resumen");
            const adapted = adaptResumenToDashboard(r.data);
            // quick log para ver si vienen los estados
            if (!adapted.orders_by_status?.length) {
            console.warn("pedidos_por_estado vacío o no encontrado en /analytics/resumen:", r.data?.pedidos_por_estado);
            }
            setData(adapted);
        } catch (e) {
            const m = e?.response?.data?.detail || "No se pudo cargar la analítica.";
            setErr(m);
        }
        })();
    }, []);

    if (err) return <div className="err">{err}</div>;
    if (!data) return <div className="loading">Cargando analítica…</div>;

    const { kpis, orders_by_status, weekly_revenue } = data;

    return (
        <div className="analytics">
        <div className="kpi-strip">
            <Kpi icon="👤" label="Total Users" value={kpis.usuarios_totales} />
            <Kpi icon="✅" label="Total Active" value={kpis.usuarios_activos_7d} />
            <Kpi icon="🛒" label="Total Products" value={kpis.productos_totales} />
            <Kpi icon="📦" label="Pending Orders" value={kpis.pedidos_pendientes} />
            <Kpi icon="💰" label="Weekly Sales" value={`Q ${kpis.ventas_semana_total.toFixed(2)}`} />
        </div>

        <div className="content-grid">
            <Card title="Órdenes por estado">
            <StatusSummary items={orders_by_status} />
            </Card>

            <Card title="Ingresos: semana actual vs pasada">
            <RevenueChart data={weekly_revenue} />
            </Card>
        </div>
        </div>
    );
    }

    /* ---------- small UI ---------- */

    function Kpi({ icon, label, value }) {
    return (
        <div className="kpi-card">
        <div className="kpi-top">
            <span className="kpi-pill">+7d</span>
            <span className="kpi-avatar">{icon}</span>
        </div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        </div>
    );
    }

    function Card({ title, children }) {
    return (
        <div className="panel">
        <div className="panel-head">
            <h4>{title}</h4>
        </div>
        {children}
        </div>
    );
    }

    /* ---------- status summary ---------- */

    function StatusSummary({ items }) {
    if (!items?.length)
        return <div className="muted">No hay datos.</div>;

    return (
        <div className="status-list">
        {items.map((r, i) => (
            <div key={i} className="status-row">
            <span className="status-name">{r.estado}</span>
            <span className={`status-badge ${pickStatusClass(r.estado)}`}>{r.cantidad}</span>
            </div>
        ))}
        </div>
    );
    }

    function pickStatusClass(estado = "") {
    const e = estado.toLowerCase();
    if (e.includes("abierto") || e.includes("pend")) return "warn";
    if (e.includes("proceso")) return "info";
    if (e.includes("entregado") || e.includes("cerrado")) return "ok";
    if (e.includes("cancel")) return "bad";
    return "muted";
    }

    /* ---------- canvas chart (sin libs) ---------- */

    function RevenueChart({ data }) {
    const canvasRef = useRef(null);

    const payload = useMemo(() => {
        if (!data) return null;
        return {
        labels: data.labels || [],
        cur: data.current || [],
        prev: data.previous || [],
        };
    }, [data]);

    useEffect(() => {
        if (!payload) return;
        const cvs = canvasRef.current;
        const ctx = cvs.getContext("2d");
        const DPR = window.devicePixelRatio || 1;

        const WIDTH = cvs.clientWidth * DPR;
        const HEIGHT = 280 * DPR;
        cvs.width = WIDTH;
        cvs.height = HEIGHT;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        const pad = 32 * DPR;
        const w = WIDTH - pad * 2;
        const h = HEIGHT - pad * 2;

        const maxVal = Math.max(1, ...payload.cur, ...payload.prev);
        const x = (i) => pad + (i / (payload.labels.length - 1 || 1)) * w;
        const y = (v) => pad + h - (v / maxVal) * h;

        // background
        ctx.fillStyle = "#f8fbff";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // grid
        ctx.strokeStyle = "#e6eef9";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
        const yy = pad + (i / 4) * h;
        ctx.beginPath();
        ctx.moveTo(pad, yy);
        ctx.lineTo(WIDTH - pad, yy);
        ctx.stroke();
        }

        // current (blue)
        drawLine(ctx, payload.cur, x, y, "#3b82f6");
        fillArea(ctx, payload.cur, x, y, WIDTH, HEIGHT, pad, "#3b82f620");

        // previous (gray)
        drawLine(ctx, payload.prev, x, y, "#94a3b8");

        // labels X
        ctx.fillStyle = "#64748b";
        ctx.font = `${12 * DPR}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        payload.labels.forEach((lb, i) => {
        const xx = x(i);
        ctx.fillText(lb, xx - 16 * DPR, HEIGHT - pad + 16 * DPR);
        });
    }, [payload]);

    return (
        <>
        <div className="legend muted">Azul: semana actual • Gris: semana pasada</div>
        <div className="chart-wrap">
            <canvas ref={canvasRef} className="chart" />
        </div>
        </>
    );
    }

    function drawLine(ctx, series, x, y, color) {
    if (!series?.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x(0), y(series[0]));
    for (let i = 1; i < series.length; i++) ctx.lineTo(x(i), y(series[i]));
    ctx.stroke();
    }
    function fillArea(ctx, series, x, y, W, H, pad, fill) {
    if (!series?.length) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x(0), y(series[0]));
    for (let i = 1; i < series.length; i++) ctx.lineTo(x(i), y(series[i]));
    ctx.lineTo(x(series.length - 1), H - pad);
    ctx.lineTo(x(0), H - pad);
    ctx.closePath();
    ctx.fill();
    }

    /* ---------- adaptador para /analytics/resumen ---------- */
    function adaptResumenToDashboard(res) {
    // res: { kpis:{usuarios,productos,pedidos,ventas_totales,...}, pedidos_por_estado:[{estado,cantidad}], ... }
    const k = res?.kpis || {};
    // Si aún no calculas ingresos semanales, usamos ventas_totales como placeholder
    return {
        kpis: {
        usuarios_totales: k.usuarios ?? 0,
        usuarios_activos_7d: 0, // si no hay este dato
        productos_totales: k.productos ?? 0,
        pedidos_pendientes:
            (res?.pedidos_por_estado || []).find((x) => /abierto|pend/i.test(x.estado))?.cantidad ?? 0,
        ventas_semana_total: Number(k.ventas_totales ?? 0),
        },
        orders_by_status: res?.pedidos_por_estado || [],
        weekly_revenue: {
        // placeholder; si ya tienes endpoint de ingresos/semana, mapea aquí
        labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
        current: [0, 0, 0, 0, 0, 0, 0],
        previous: [0, 0, 0, 0, 0, 0, 0],
        },
    };
}