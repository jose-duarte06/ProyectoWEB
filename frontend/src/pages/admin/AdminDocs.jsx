import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import "./AdminDocs.css";

const ACCEPTED = [".pdf", ".txt", ".md"];
const MAX_MB = 8;

export default function AdminDocs() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    // búsqueda
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchRes, setSearchRes] = useState(null);

    // drag&drop
    const dropRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    async function loadFiles() {
        setLoading(true);
        setErr("");
        try {
        const r = await api.get("/rag/files");
        setFiles(r.data?.files || []);
        } catch (e) {
        setErr(e?.response?.data?.detail || "No se pudieron cargar los archivos.");
        } finally {
        setLoading(false);
        }
    }

    useEffect(() => {
        loadFiles();
    }, []);

    async function onUpload(oneFile) {
        if (!oneFile) return;

        const ext = (oneFile.name || "").toLowerCase().slice(oneFile.name.lastIndexOf("."));
        if (!ACCEPTED.includes(ext)) {
        setErr("Formato no soportado. Usa PDF, TXT o MD.");
        return;
        }
        if (oneFile.size > MAX_MB * 1024 * 1024) {
        setErr(`Archivo mayor a ${MAX_MB}MB.`);
        return;
        }
        setBusy(true);
        setErr("");
        try {
        const fd = new FormData();
        fd.append("file", oneFile);
        await api.post("/rag/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        await loadFiles();
        } catch (e) {
        setErr(e?.response?.data?.detail || "Error subiendo archivo.");
        } finally {
        setBusy(false);
        }
    }

    async function onDelete(name) {
        if (!confirm(`Eliminar "${name}"?`)) return;
        setBusy(true);
        setErr("");
        try {
        await api.delete(`/rag/files/${encodeURIComponent(name)}`);
        await loadFiles();
        } catch (e) {
        setErr(e?.response?.data?.detail || "No se pudo eliminar.");
        } finally {
        setBusy(false);
        }
    }

    async function onReindex() {
        if (!files.length && !confirm("No hay archivos. ¿Reindexar de todos modos?")) return;
        setBusy(true);
        setErr("");
        try {
        await api.post("/rag/reindex");
        // no hace falta recargar lista; ya está
        } catch (e) {
        setErr(e?.response?.data?.detail || "Falló el reindexado.");
        } finally {
        setBusy(false);
        }
    }

    async function onSearch(e) {
        e?.preventDefault?.();
        const q = query.trim();
        if (!q) return;
        setSearching(true);
        setErr("");
        setSearchRes(null);
        try {
        const r = await api.get("/rag/search", { params: { q, k: 4 } });
        setSearchRes(r.data);
        } catch (e) {
        setErr(e?.response?.data?.detail || "No se pudo ejecutar la búsqueda.");
        } finally {
        setSearching(false);
        }
    }

    // drag handlers
    useEffect(() => {
        const el = dropRef.current;
        if (!el) return;

        const onDragOver = (ev) => {
        ev.preventDefault();
        setDragOver(true);
        };
        const onDragLeave = (ev) => {
        ev.preventDefault();
        setDragOver(false);
        };
        const onDrop = (ev) => {
        ev.preventDefault();
        setDragOver(false);
        const f = ev.dataTransfer?.files?.[0];
        if (f) onUpload(f);
        };

        el.addEventListener("dragover", onDragOver);
        el.addEventListener("dragleave", onDragLeave);
        el.addEventListener("drop", onDrop);
        return () => {
        el.removeEventListener("dragover", onDragOver);
        el.removeEventListener("dragleave", onDragLeave);
        el.removeEventListener("drop", onDrop);
        };
    }, []);

    return (
        <div className="docs-wrap">
        {/* HEADER */}
        <div className="docs-head">
            <h3>Documentación (RAG)</h3>
            <div className="docs-actions">
            <button className="btn ghost" disabled={busy || loading} onClick={loadFiles}>
                Refrescar
            </button>
            <button className="btn" disabled={busy || loading} onClick={onReindex}>
                Reindexar
            </button>
            </div>
        </div>

        {err && <div className="alert error">{err}</div>}

        {/* GRID: upload + list */}
        <div className="docs-grid">
            {/* UPLOAD */}
            <section className="panel">
            <div className="panel-head">
                <h4>Subir archivo</h4>
                <div className="muted">Formatos: PDF, TXT, MD — máx {MAX_MB}MB</div>
            </div>

            <div ref={dropRef} className={`dropzone ${dragOver ? "drag" : ""}`}>
                <div className="dz-inner">
                <br></br>
                <div className="dz-icon">⬆️</div>
                <div className="dz-or">Subir archivo</div>
                <br></br>
                <label className="btn">
                    Elegir archivo
                    <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={(e) => onUpload(e.target.files?.[0])}
                    hidden
                    />
                </label>
                </div>
            </div>

            {busy && <div className="muted">Procesando…</div>}
            </section>

            {/* FILES LIST */}
            <section className="panel">
            <div className="panel-head">
                <h4>Archivos en índice</h4>
                <div className="muted">{loading ? "Cargando…" : `${files.length} archivo(s)`}</div>
            </div>

            {loading ? (
                <div className="muted">Cargando…</div>
            ) : !files.length ? (
                <div className="muted">No hay archivos.</div>
            ) : (
                <ul className="file-list">
                {files.map((f) => (
                    <li key={f} className="file-row">
                    <div className="file-name" title={f}>{f}</div>
                    <button className="btn danger" disabled={busy} onClick={() => onDelete(f)}>
                        Eliminar
                    </button>
                    </li>
                ))}
                </ul>
            )}
            </section>
        </div>

        {/* SEARCH / TEST */}
        <section className="panel">
            <div className="panel-head">
            <h4>Probar búsqueda</h4>
            <div className="muted">Haz una pregunta para ver el contexto y la respuesta</div>
            </div>

            <form className="search-row" onSubmit={onSearch}>
            <input
                className="input"
                placeholder="Ej. ¿Cuál es la política de devoluciones?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn" disabled={searching || !query.trim()}>
                {searching ? "Buscando…" : "Buscar"}
            </button>
            </form>

            {searchRes && (
            <div className="search-results">
                <div className="answer">
                <div className="answer-title">Respuesta</div>
                <div className="answer-text">{searchRes.answer || "Sin respuesta."}</div>
                </div>

                <div className="hits">
                <div className="hits-title">Contexto (top hits)</div>
                {!searchRes.hits?.length ? (
                    <div className="muted">No hay contexto disponible.</div>
                ) : (
                    <ul className="hits-list">
                    {searchRes.hits.map((h, i) => (
                        <li key={i} className="hit">
                        <div className="hit-meta">
                            <span className="hit-score">score {h.score?.toFixed?.(3) ?? h.score}</span>
                            {h.meta?.filename && <span className="hit-file">{h.meta.filename}</span>}
                        </div>
                        <div className="hit-text">{h.text}</div>
                        </li>
                    ))}
                    </ul>
                )}
                </div>
            </div>
            )}
        </section>
        </div>
    );
    }