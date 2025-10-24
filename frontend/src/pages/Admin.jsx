import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";

import ProductsAdmin from "./admin/Products.jsx";
import OrdersAdmin from "./admin/Orders.jsx";
import AdminDocs from "./admin/AdminDocs.jsx";
import AdminAnalytics from "./admin/AdminAnalytics.jsx";

import "./admin/AdminShell.css";

const TABS = [
  { key: "productos", label: "Productos" },
  { key: "pedidos",   label: "Pedidos" },
  { key: "docs",      label: "Documentación" },
  { key: "analytics", label: "Analítica" },
];

export default function Admin() {
  const [me, setMe]   = useState(null);
  const [err, setErr] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  // lee tab inicial de ?tab=  (fallback: analytics)
  const initialTab = useMemo(() => {
    const qp = searchParams.get("tab");
    const exists = TABS.some(t => t.key === qp);
    return exists ? qp : "analytics";
  }, [searchParams]);

  const [tab, setTab] = useState(initialTab);

  // sincroniza si cambia el query param externamente
  useEffect(() => {
    if (tab !== initialTab) setTab(initialTab);
  }, [initialTab]); // eslint-disable-line

  // si no venía ?tab= en la URL, forzamos analytics
  useEffect(() => {
    if (!searchParams.get("tab")) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", "analytics");
      setSearchParams(next, { replace: true });
    }
  }, []); // una vez

  // cambiar pestaña y persistir en URL
  function selectTab(next) {
    setTab(next);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  }

  useEffect(() => {
    let mounted = true;
    api.get("/usuarios/perfil")
      .then(r => { if (mounted) setMe(r.data); })
      .catch(() => setErr("No autorizado o sesión expirada."))
      .finally(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="admin-shell">
      {/* HEADER */}
      <header className="admin-header">
        <div className="admin-title">
          <div className="admin-dot" />
          <h2>Administración</h2>
        </div>
        <div className="admin-user">
          {me ? (
            <span>{me.nombre} — <b>{me.rol}</b></span>
          ) : (
            <span className="admin-user-ghost">Cargando…</span>
          )}
        </div>
      </header>

      {/* NAV TABS */}
      <nav className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`admin-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => selectTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ERRORES GLOBALES */}
      {err && <div className="admin-error">{err}</div>}

      {/* CONTENIDO */}
      <main className="admin-content">
        {tab === "productos"  && <ProductsAdmin />}
        {tab === "pedidos"    && <OrdersAdmin />}
        {tab === "docs"       && <AdminDocs />}
        {tab === "analytics"  && <AdminAnalytics />}
      </main>
    </div>
  );
}