import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./Orders.css";

/**
 * Intentamos ser tolerantes con tu API:
 *  - Listado:   primero /pedidos/admin, si no existe → /pedidos
 *  - Detalle:   GET /pedidos/:id
 *  - Actualizar estado:
 *      1) PATCH /pedidos/:id/estado   body {estado}
 *      2) si falla: PUT   /pedidos/:id body {estado}
 *      3) si falla: PATCH /pedidos/:id body {estado}
 *
 * Campos esperados por cada pedido en el listado:
 *  { id, usuario_id, cliente_nombre?, total, estado, fecha? }
 * Si tu campo fecha se llama 'creado_en', 'fecha', etc., lo mapeamos abajo.
 */

const ESTADOS = ["abierto", "pendiente", "en_proceso", "entregado", "cancelado"];

export default function OrdersAdmin() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [q, setQ] = useState("");
    const [status, setStatus] = useState("todos");
    const [sort, setSort] = useState("recientes"); // 'recientes'|'total_desc'|'total_asc'|'cliente'
    const [from, setFrom] = useState(""); // YYYY-MM-DD
    const [to, setTo] = useState("");

    // detalle
    const [sel, setSel] = useState(null); // pedido seleccionando (detalle)
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // -------- fetch listado --------
    function mapOrder(p) {
        const fecha =
        p.fecha || p.creado_en || p.created_at || null;
        return {
        id: p.id,
        cliente_id: p.usuario_id ?? p.cliente_id ?? null,
        cliente: p.cliente_nombre || p.cliente || `#${p.usuario_id ?? "-"}`,
        total: Number(p.total ?? 0),
        estado: (p.estado || "").toLowerCase(),
        fecha: fecha ? new Date(fecha) : null,
        raw: p,
        };
    }

    async function fetchList() {
        setLoading(true);
        setErr("");
        try {
        // preferimos endpoint admin si existe
        let r;
        try {
            r = await api.get("/pedidos/admin");
        } catch {
            r = await api.get("/pedidos");
        }
        const list = (r.data || []).map(mapOrder);
        setRows(list);
        } catch (e) {
        setErr(e?.response?.data?.detail || "No se pudieron cargar los pedidos.");
        } finally {
        setLoading(false);
        }
    }

    useEffect(() => {
        fetchList();
    }, []);

    // -------- detalle --------
    async function openDetail(p) {
        setSel(p);
        setDetail(null);
        setLoadingDetail(true);
        try {
        const r = await api.get(`/pedidos/${p.id}`);
        // esperamos que el backend devuelva {detalles:[{producto:{nombre,imagen_url?}, cantidad, precio_unitario}], ...}
        const d = r.data || {};
        const lineas = (d.detalles || d.lineas || []).map((x) => ({
            nombre: x.producto?.nombre ?? x.nombre ?? "Producto",
            imagen_url: x.producto?.imagen_url ?? x.imagen_url ?? x.imagen ?? "",
            cantidad: Number(x.cantidad ?? 1),
            precio: Number(x.precio_unitario ?? x.precio ?? 0),
        }));
        setDetail({
            id: d.id ?? p.id,
            cliente: d.cliente_nombre ?? p.cliente,
            estado: (d.estado ?? p.estado)?.toLowerCase(),
            fecha: d.fecha || d.creado_en || (p.fecha ? p.fecha.toISOString() : null),
            total: Number(d.total ?? p.total),
            lineas,
        });
        } catch (e) {
        setDetail({ error: e?.response?.data?.detail || "No se pudo cargar el detalle." });
        } finally {
        setLoadingDetail(false);
        }
    }

    // -------- actualizar estado --------
    async function updateEstado(pedidoId, estado) {
        // optimista
        setRows((old) =>
        old.map((r) => (r.id === pedidoId ? { ...r, estado } : r))
        );
        try {
        try {
            await api.patch(`/pedidos/${pedidoId}/estado`, { estado });
        } catch {
            try {
            await api.put(`/pedidos/${pedidoId}`, { estado });
            } catch {
            await api.patch(`/pedidos/${pedidoId}`, { estado });
            }
        }
        // si el modal está abierto, también sincronizamos
        if (detail?.id === pedidoId) setDetail({ ...detail, estado });
        } catch (e) {
        alert(e?.response?.data?.detail || "No se pudo actualizar el estado.");
        // revertir
        fetchList();
        }
    }

    // -------- filtros/orden --------
    const filtered = useMemo(() => {
        let list = rows;

        if (q.trim()) {
        const s = q.toLowerCase();
        list = list.filter(
            (r) =>
            r.id.toString().includes(s) ||
            r.cliente?.toLowerCase().includes(s)
        );
        }
        if (status !== "todos") {
        list = list.filter((r) => (r.estado || "") === status);
        }
        if (from) {
        const f = new Date(from);
        list = list.filter((r) => !r.fecha || r.fecha >= f);
        }
        if (to) {
        const t = new Date(to);
        // incluir el día completo
        t.setHours(23, 59, 59, 999);
        list = list.filter((r) => !r.fecha || r.fecha <= t);
        }

        switch (sort) {
        case "total_desc":
            list = [...list].sort((a, b) => b.total - a.total);
            break;
        case "total_asc":
            list = [...list].sort((a, b) => a.total - b.total);
            break;
        case "cliente":
            list = [...list].sort((a, b) =>
            (a.cliente || "").localeCompare(b.cliente || "")
            );
            break;
        default:
            // recientes por id o fecha
            list = [...list].sort((a, b) => {
            if (a.fecha && b.fecha) return b.fecha - a.fecha;
            return b.id - a.id;
            });
        }

        return list;
    }, [rows, q, status, from, to, sort]);

    // -------- KPIs por estado --------
    const kpis = useMemo(() => {
        const base = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
        for (const r of rows) {
        if (base.hasOwnProperty(r.estado)) base[r.estado] += 1;
        }
        return base;
    }, [rows]);

    return (
        <div className="orders-admin">
        {/* KPIs */}
        <div className="orders-kpis">
            <Kpi label="Abiertos" value={kpis.abierto} tone="warn" />
            <Kpi label="Pendientes" value={kpis.pendiente} tone="info" />
            <Kpi label="En proceso" value={kpis.en_proceso} tone="info" />
            <Kpi label="Entregados" value={kpis.entregado} tone="ok" />
            <Kpi label="Cancelados" value={kpis.cancelado} tone="bad" />
        </div>

        {/* Filtros */}
        <div className="orders-toolbar">
            <input
            className="in"
            placeholder="Buscar por id o cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            />

            <select className="in" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todos</option>
            {ESTADOS.map((e) => (
                <option key={e} value={e}>{labelEstado(e)}</option>
            ))}
            </select>

            <div className="range">
            <label>Desde</label>
            <input className="in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <label>Hasta</label>
            <input className="in" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>

            <select className="in" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recientes">Más recientes</option>
            <option value="total_desc">Total ↓</option>
            <option value="total_asc">Total ↑</option>
            <option value="cliente">Cliente A–Z</option>
            </select>

            <button className="btn" onClick={fetchList}>Actualizar</button>
        </div>

        {/* Tabla */}
        {err && <div className="error">{err}</div>}
        {loading ? (
            <div className="muted">Cargando pedidos…</div>
        ) : (
            <div className="table-wrap">
            <table className="tbl">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
                </thead>
                <tbody>
                {filtered.map((r) => (
                    <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{r.cliente}</td>
                    <td>{r.fecha ? fmtDate(r.fecha) : "—"}</td>
                    <td className="mono">Q {r.total.toFixed(2)}</td>
                    <td>
                        <EstadoBadge estado={r.estado} />
                    </td>
                    <td className="act">
                        <select
                        className="in small"
                        value={r.estado}
                        onChange={(e) => updateEstado(r.id, e.target.value)}
                        >
                        {ESTADOS.map((e) => (
                            <option key={e} value={e}>{labelEstado(e)}</option>
                        ))}
                        </select>
                        <button className="btn ghost" onClick={() => openDetail(r)}>
                        Ver
                        </button>
                    </td>
                    </tr>
                ))}
                {!filtered.length && (
                    <tr>
                    <td colSpan="6" className="muted center">Sin resultados.</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        )}

        {/* Modal detalle */}
        {sel && (
            <div className="modal" onClick={() => setSel(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                <h4>Pedido #{sel.id}</h4>
                <button className="icon" onClick={() => setSel(null)}>✕</button>
                </div>

                <div className="modal-body">
                {loadingDetail ? (
                    <div className="muted">Cargando…</div>
                ) : detail?.error ? (
                    <div className="error">{detail.error}</div>
                ) : detail ? (
                    <>
                    <div className="detail-top">
                        <div>
                        <div className="muted">Cliente</div>
                        <div className="dt-strong">{detail.cliente}</div>
                        </div>
                        <div>
                        <div className="muted">Fecha</div>
                        <div className="dt-strong">{detail.fecha ? fmtDateTime(detail.fecha) : "—"}</div>
                        </div>
                        <div>
                        <div className="muted">Estado</div>
                        <EstadoBadge estado={detail.estado} />
                        </div>
                        <div className="total-box">
                        <div className="muted">Total</div>
                        <div className="grand">Q {Number(detail.total).toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="lines">
                        {(detail.lineas || []).map((l, i) => (
                        <div key={i} className="line">
                            <div className="thumb">
                            {l.imagen_url ? (
                                <img src={l.imagen_url} alt={l.nombre} />
                            ) : (
                                <div className="ph">IMG</div>
                            )}
                            </div>
                            <div className="li-name">{l.nombre}</div>
                            <div className="li-qty mono">x{l.cantidad}</div>
                            <div className="li-price mono">Q {l.precio.toFixed(2)}</div>
                            <div className="li-sub mono">Q {(l.precio * l.cantidad).toFixed(2)}</div>
                        </div>
                        ))}
                        {!detail.lineas?.length && (
                        <div className="muted">Sin líneas.</div>
                        )}
                    </div>
                    </>
                ) : null}
                </div>

                <div className="modal-actions">
                <button className="btn" onClick={() => setSel(null)}>Cerrar</button>
                </div>
            </div>
            </div>
        )}
        </div>
    );
    }

    /* ----- UI helpers ----- */

    function Kpi({ label, value, tone = "muted" }) {
    return (
        <div className={`kpi ${tone}`}>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        </div>
    );
    }

    function EstadoBadge({ estado }) {
    const cls = pickTone(estado);
    return <span className={`badge ${cls}`}>{labelEstado(estado)}</span>;
    }

    function labelEstado(e = "") {
    const map = {
        abierto: "Abierto",
        pendiente: "Pendiente",
        en_proceso: "En proceso",
        entregado: "Entregado",
        cancelado: "Cancelado",
    };
    return map[e] || (e?.charAt(0).toUpperCase() + e?.slice(1));
    }

    function pickTone(e = "") {
    const s = e.toLowerCase();
    if (s.includes("entreg")) return "ok";
    if (s.includes("proce")) return "info";
    if (s.includes("pend") || s.includes("abier")) return "warn";
    if (s.includes("cancel")) return "bad";
    return "muted";
    }

    function fmtDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString();
    }
    function fmtDateTime(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleString();
    }