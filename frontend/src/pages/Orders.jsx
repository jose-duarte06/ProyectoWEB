import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import QuickNav from "../components/QuickNav.jsx";
import "./Orders.css";

const ESTADOS = [
    { key: "todos", label: "Todos" },
    { key: "abierto", label: "Abiertos" },
    { key: "pendiente", label: "Pendientes" },
    { key: "en_proceso", label: "En proceso" },
    { key: "entregado", label: "Entregados" },
    { key: "cerrado", label: "Cerrados" },
    { key: "cancelado", label: "Cancelados" },
    ];

    function chipClass(estado = "") {
    const e = String(estado).toLowerCase();
    if (/(abiert|pend)/.test(e)) return "chip warn";
    if (/proceso/.test(e)) return "chip info";
    if (/(entreg|cerrad)/.test(e)) return "chip ok";
    if (/cancel/.test(e)) return "chip bad";
    return "chip";
    }
    function fmtDate(d) {
    try { return new Date(d).toLocaleString(); } catch { return d || ""; }
    }
    function money(v) { return `Q ${Number(v || 0).toFixed(2)}`; }

    export default function Orders() {
    const [panel, setPanel] = useState("pedidos"); // pedidos | comprobantes

    const [orders, setOrders] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [q, setQ] = useState("");
    const [tab, setTab] = useState("todos");

    const [recByOrder, setRecByOrder] = useState({});
    const [allReceipts, setAllReceipts] = useState([]);
    const [rErr, setRErr] = useState("");
    const [rLoading, setRLoading] = useState(false);

    async function load() {
        setLoading(true); setErr("");
        try {
        const r = await api.get("/pedidos");
        const list = Array.isArray(r.data) ? r.data : [];
        setOrders(list.map(o => ({
            ...o,
            estado: (o.estado || "").toLowerCase(),
            total: Number(o.total || 0),
        })));
        } catch (e) {
        setErr(e?.response?.data?.detail || "No se pudieron cargar tus pedidos.");
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    const summary = useMemo(() => {
        const m = { abierto:0, pendiente:0, en_proceso:0, entregado:0, cerrado:0, cancelado:0 };
        for (const o of orders) if (o.estado in m) m[o.estado] += 1;
        return m;
    }, [orders]);

    const list = useMemo(() => {
        const term = q.trim().toLowerCase();
        return orders
        .filter(o => (tab === "todos" ? true : o.estado === tab))
        .filter(o => {
            if (!term) return true;
            const idMatch = String(o.id).includes(term);
            const estadoMatch = (o.estado || "").includes(term);
            const detMatch = (o.detalles || []).some(d =>
            String(d?.producto?.nombre || "").toLowerCase().includes(term)
            );
            return idMatch || estadoMatch || detMatch;
        });
    }, [orders, tab, q]);

    async function toggleExpand(o) {
        const isOpen = !!expanded[o.id];
        if (isOpen) { setExpanded(e => ({ ...e, [o.id]: false })); return; }

        if (!Array.isArray(o.detalles) || !o.detalles.length) {
        try {
            const r = await api.get(`/pedidos/${o.id}`);
            const full = r.data || {};
            setOrders(prev => prev.map(x => (x.id === o.id ? { ...x, ...full } : x)));
        } catch { /* ignore */ }
        }
        await loadOrderReceipts(o.id);
        setExpanded(e => ({ ...e, [o.id]: true }));
    }

    async function loadOrderReceipts(pedidoId) {
        try {
        const r = await api.get(`/pagos/pedido/${pedidoId}`);
        const arr = Array.isArray(r.data) ? r.data : [];
        setRecByOrder(prev => ({ ...prev, [pedidoId]: arr }));
        } catch {
        setRecByOrder(prev => ({ ...prev, [pedidoId]: [] }));
        }
    }

    async function uploadReceipt(pedidoId, file) {
        if (!file) return;
        const fd = new FormData();
        fd.append("pedido_id", String(pedidoId));
        fd.append("archivo", file);
        try {
        // NO forzar Content-Type: axios pone el boundary correcto
        await api.post("/pagos/comprobantes", fd);
        await loadOrderReceipts(pedidoId);
        alert("Comprobante subido.");
        } catch (e) {
        alert(e?.response?.data?.detail || "No se pudo subir el comprobante.");
        }
    }

    useEffect(() => {
        if (panel !== "comprobantes") return;
        (async () => {
        setRLoading(true); setRErr("");
        try {
            const r = await api.get("/pagos/mis-comprobantes");
            setAllReceipts(Array.isArray(r.data) ? r.data : []);
        } catch (e) {
            setRErr(e?.response?.data?.detail || "No se pudieron cargar tus comprobantes.");
        } finally { setRLoading(false); }
        })();
    }, [panel]);

    return (
        <div className="orders-page">
        <QuickNav active="orders" />

        <div className="orders-head">
            <h2>Mis pedidos</h2>
            <div className="orders-tools">
            <input
                className="input"
                placeholder="Buscar por #, estado o producto…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn" onClick={load}>Refrescar</button>
            </div>
        </div>

        <div className="inner-tabs">
            <button
            className={`inner-tab ${panel === "pedidos" ? "active" : ""}`}
            onClick={() => setPanel("pedidos")}
            >Pedidos</button>
            <button
            className={`inner-tab ${panel === "comprobantes" ? "active" : ""}`}
            onClick={() => setPanel("comprobantes")}
            >Comprobantes</button>
        </div>

        {panel === "comprobantes" ? (
            <section className="receipts-panel">
            {rErr && <div className="alert error">{rErr}</div>}
            {rLoading ? (
                <div className="loading">Cargando comprobantes…</div>
            ) : !allReceipts.length ? (
                <div className="orders-empty card">
                <p>No has subido comprobantes aún.</p>
                <Link className="btn primary" to="/productos">Ir al catálogo</Link>
                </div>
            ) : (
                <div className="receipt-grid">
                {allReceipts.map((rc) => (
                    <article key={rc.id} className="receipt-card">
                    <div className="rc-thumb" style={{ backgroundImage: `url('${rc.url}')` }} />
                    <div className="rc-body">
                        <div className="rc-row"><b>Pedido</b><span>#{rc.pedido_id}</span></div>
                        <div className="rc-row">
                        <span className="muted">{fmtDate(rc.subido_en || rc.creado_en)}</span>
                        <a className="btn" href={rc.url} target="_blank" rel="noreferrer">Ver</a>
                        </div>
                    </div>
                    </article>
                ))}
                </div>
            )}
            </section>
        ) : (
            <>
            <div className="orders-summary">
                {ESTADOS.map((s) => (
                <button
                    key={s.key}
                    className={`sum-card ${tab === s.key ? "active" : ""}`}
                    onClick={() => setTab(s.key)}
                >
                    <div className="sum-title">{s.label}</div>
                    {s.key === "todos" ? (
                    <div className="sum-value">{orders.length}</div>
                    ) : (
                    <div className="sum-value">{summary[s.key] ?? 0}</div>
                    )}
                </button>
                ))}
            </div>

            {err && <div className="alert error">{err}</div>}

            {loading ? (
                <div className="loading">Cargando pedidos…</div>
            ) : !list.length ? (
                <div className="orders-empty card">
                <p>No tienes pedidos en esta vista.</p>
                <Link className="btn primary" to="/productos">Ir al catálogo</Link>
                </div>
            ) : (
                <div className="orders-list">
                {list.map((o) => {
                    const isOpen = !!expanded[o.id];
                    const receipts = recByOrder[o.id] || [];
                    return (
                    <article key={o.id} className="order-card">
                        <header className="order-head">
                        <div className="order-id"># {o.id}</div>
                        <div className="order-date">{fmtDate(o.fecha || o.creado_en)}</div>
                        <div className={chipClass(o.estado)}>{o.estado || "—"}</div>
                        <div className="order-total">{money(o.total)}</div>
                        <button className="btn" onClick={() => toggleExpand(o)}>
                            {isOpen ? "Ocultar" : "Ver detalle"}
                        </button>
                        </header>

                        {isOpen && (
                        <div className="order-body">
                            {Array.isArray(o.detalles) && o.detalles.length ? (
                            <table className="order-table">
                                <thead>
                                <tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
                                </thead>
                                <tbody>
                                {o.detalles.map((d) => {
                                    const nombre = d?.producto?.nombre ?? d?.nombre ?? `#${d.producto_id}`;
                                    const precio = Number(d?.precio_unitario ?? d?.precio ?? 0);
                                    const cant = Number(d?.cantidad ?? 0);
                                    return (
                                    <tr key={d.id || `${o.id}-${d.producto_id}`}>
                                        <td className="prod-name">{nombre}</td>
                                        <td>{cant}</td>
                                        <td>{money(precio)}</td>
                                        <td>{money(precio * cant)}</td>
                                    </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                            ) : (
                            <div className="muted">No hay detalles para mostrar.</div>
                            )}

                            <div className="receipts-box">
                            <div className="rb-head">
                                <h4>Comprobantes de pago</h4>
                                <label className="btn small">
                                Subir comprobante
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadReceipt(o.id, f);
                                    e.target.value = "";
                                    }}
                                    style={{ display: "none" }}
                                />
                                </label>
                            </div>

                            {!receipts.length ? (
                                <div className="muted">Aún no hay comprobantes para este pedido.</div>
                            ) : (
                                <div className="receipt-grid small">
                                {receipts.map((rc) => (
                                    <article key={rc.id} className="receipt-card">
                                    <div className="rc-thumb" style={{ backgroundImage: `url('${rc.url}')` }} />
                                    <div className="rc-body">
                                        <div className="rc-row">
                                        <span className="muted">
                                            {fmtDate(rc.subido_en || rc.creado_en)}
                                        </span>
                                        <a className="btn" href={rc.url} target="_blank" rel="noreferrer">Ver</a>
                                        </div>
                                    </div>
                                    </article>
                                ))}
                                </div>
                            )}
                            </div>
                        </div>
                        )}
                    </article>
                    );
                })}
                </div>
            )}
            </>
        )}
        </div>
    );
    }