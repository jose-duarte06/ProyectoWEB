import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminDocs() {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [indexing, setIndexing] = useState(false);
    const [searching, setSearching] = useState(false);

    const [msg, setMsg] = useState("");
    const [loaded, setLoaded] = useState(null);

    const [q, setQ] = useState("");
    const [hits, setHits] = useState([]);

    async function fetchStatus() {
        try {
        const r = await api.get("/rag/status");
        setLoaded(r.data.loaded);
        } catch {
        setLoaded(false);
        }
    }

    useEffect(() => { fetchStatus(); }, []);

    async function onUpload(e) {
        e.preventDefault();
        if (!files?.length) return;
        setUploading(true); setMsg(""); setHits([]);
        try {
        for (const file of files) {
            const form = new FormData();
            form.append("file", file);
            await api.post("/rag/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
            });
        }
        setMsg(`✅ ${files.length} archivo(s) subido(s). Ahora pulsa "Reindexar".`);
        } catch (err) {
        const status = err?.response?.status;
        setMsg(`❌ Error subiendo archivo(s). Status: ${status ?? "desconocido"}.`);
        } finally {
        setUploading(false);
        }
    }

    async function onReindex() {
        setIndexing(true); setMsg(""); setHits([]);
        try {
        const r = await api.post("/rag/reindex");
        setMsg(`🧠 Índice reconstruido con ${r.data.chunks} chunks.`);
        await fetchStatus();
        } catch (err) {
        const status = err?.response?.status;
        const errMsg = err?.response?.data?.detail || "No se pudo reindexar.";
        setMsg(`❌ Error reindexando. Status ${status ?? "?"}: ${errMsg}`);
        } finally {
        setIndexing(false);
        }
    }

    async function onSearch(e) {
        e.preventDefault();
        if (!q.trim()) return;
        setSearching(true); setMsg(""); setHits([]);
        try {
        const r = await api.get(`/rag/search`, { params: { q, k: 4 } });
        setHits(r.data.hits || []);
        if (!r.data.hits?.length) setMsg("Sin resultados en el índice.");
        } catch (err) {
        const status = err?.response?.status;
        setMsg(`❌ Error buscando. Status: ${status ?? "desconocido"}.`);
        } finally {
        setSearching(false);
        }
    }

    return (
        <div style={{display:"grid", gap:12}}>
        <h3>Documentación (RAG)</h3>
        <p style={{fontSize:14, opacity:.8}}>
            Sube archivos <b>PDF / TXT / MD</b>. Luego pulsa <b>Reindexar</b> para que el bot los use.
        </p>

        <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <span style={{fontSize:13}}>Estado del índice:</span>
            <span style={{fontWeight:600, color: loaded ? "green" : "crimson"}}>
            {loaded === null ? "..." : loaded ? "Cargado" : "No cargado"}
            </span>
            <button onClick={fetchStatus} disabled={uploading || indexing || searching}>
            Refrescar
            </button>
        </div>

        <form onSubmit={onUpload} style={{display:"flex", gap:8, alignItems:"center"}}>
            <input
            type="file"
            accept=".pdf,.txt,.md"
            multiple
            onChange={e => setFiles(Array.from(e.target.files))}
            />
            <button disabled={uploading || indexing || searching || !(files && files.length)}>
            {uploading ? "Subiendo..." : "Subir"}
            </button>
        </form>

        <div style={{display:"flex", gap:8}}>
            <button onClick={onReindex} disabled={indexing || uploading}>
            {indexing ? "Reindexando..." : "Reindexar"}
            </button>
        </div>

        <hr/>

        <form onSubmit={onSearch} style={{display:"flex", gap:8}}>
            <input
            placeholder="Probar búsqueda (ej. '¿cuánto tardan los envíos?')"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{flex:1, padding:"8px 10px"}}
            />
            <button disabled={searching || !loaded || !q.trim()}>
            {searching ? "Buscando..." : "Buscar"}
            </button>
        </form>

        {msg && <div style={{fontSize:14}}>{msg}</div>}

        {!!hits.length && (
            <div style={{border:"1px solid #eee", borderRadius:8, padding:8}}>
            <b>Resultados:</b>
            <ul>
                {hits.map((h,i)=>(
                <li key={i} style={{margin:"8px 0"}}>
                    <div style={{fontSize:12, opacity:.7}}>[{(h.source||"doc")} — score {h.score?.toFixed(3)}]</div>
                    <div style={{whiteSpace:"pre-wrap"}}>{h.text}</div>
                </li>
                ))}
            </ul>
            </div>
        )}
        </div>
    );
}
