import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./Products.css";

export default function ProductsAdmin() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // formulario crear
    const [fNombre, setFNombre] = useState("");
    const [fPrecio, setFPrecio] = useState("");
    const [fImg, setFImg] = useState("");
    const [fDesc, setFDesc] = useState("");

    // filtros
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("recientes"); // 'recientes' | 'precio_asc' | 'precio_desc' | 'nombre'

    // modal edición
    const [editOpen, setEditOpen] = useState(false);
    const [edit, setEdit] = useState(null); // {id, nombre, precio, ...}

    // borrar
    const [confirmId, setConfirmId] = useState(null);

    // -------- helpers --------
    const normalize = (p) => ({
        id: p.id,
        nombre: p.nombre ?? "",
        precio: Number(p.precio ?? 0),
        descripcion: p.descripcion ?? "",
        imagen_url: p.imagen_url ?? p.imagen ?? "",
        raw: p,
    });

    const fetchAll = async () => {
        setLoading(true);
        setErr("");
        try {
        const r = await api.get("/productos");
        setItems((r.data || []).map(normalize));
        } catch (e) {
        setErr(e?.response?.data?.detail || "No se pudieron cargar los productos.");
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    // -------- crear --------
    const createDisabled = !fNombre.trim() || Number(fPrecio) <= 0;

    async function createProduct(e) {
        e?.preventDefault?.();
        if (createDisabled) return;
        try {
        const payload = {
            nombre: fNombre.trim(),
            precio: Number(fPrecio),
            descripcion: fDesc.trim(),
            imagen_url: fImg.trim(),
        };
        await api.post("/productos", payload);
        setFNombre("");
        setFPrecio("");
        setFImg("");
        setFDesc("");
        fetchAll();
        } catch (e) {
        alert(e?.response?.data?.detail || "Error creando producto");
        }
    }

    // -------- editar --------
    function openEdit(p) {
        setEdit({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        descripcion: p.descripcion,
        imagen_url: p.imagen_url || "",
        });
        setEditOpen(true);
    }

    async function saveEdit() {
        if (!edit) return;
        try {
        const payload = {
            nombre: (edit.nombre || "").trim(),
            precio: Number(edit.precio || 0),
            descripcion: (edit.descripcion || "").trim(),
            imagen_url: (edit.imagen_url || "").trim(),
        };
        await api.put(`/productos/${edit.id}`, payload);
        setEditOpen(false);
        setEdit(null);
        fetchAll();
        } catch (e) {
        alert(e?.response?.data?.detail || "Error actualizando producto");
        }
    }

    // -------- eliminar --------
    async function doDelete(id) {
        try {
        await api.delete(`/productos/${id}`);
        setConfirmId(null);
        fetchAll();
        } catch (e) {
        alert(e?.response?.data?.detail || "Error eliminando producto");
        }
    }

    // -------- lista filtrada/ordenada --------
    const filtered = useMemo(() => {
        let list = items;
        if (q.trim()) {
        const s = q.toLowerCase();
        list = list.filter(
            (p) =>
            p.nombre.toLowerCase().includes(s) ||
            p.descripcion.toLowerCase().includes(s)
        );
        }
        switch (sort) {
        case "precio_asc":
            list = [...list].sort((a, b) => a.precio - b.precio);
            break;
        case "precio_desc":
            list = [...list].sort((a, b) => b.precio - a.precio);
            break;
        case "nombre":
            list = [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        default:
            list = [...list].sort((a, b) => b.id - a.id);
        }
        return list;
    }, [items, q, sort]);

    // -------- UI --------
    return (
        <div className="prod-admin">
        {/* top bar */}
        <div className="prod-toolbar">
            <div className="search-box">
            <input
                placeholder="Buscar productos…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
            />
            </div>
            <div className="sort-box">
            <label>Ordenar:</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recientes">Más recientes</option>
                <option value="precio_asc">Precio ↑</option>
                <option value="precio_desc">Precio ↓</option>
                <option value="nombre">Nombre A–Z</option>
            </select>
            </div>
        </div>

        {/* formulario crear */}
        <div className="panel form-panel">
            <div className="panel-head">
            <h4>Crear producto</h4>
            </div>
            <form className="grid-2" onSubmit={createProduct}>
            <div className="field">
                <label>Nombre *</label>
                <input
                value={fNombre}
                onChange={(e) => setFNombre(e.target.value)}
                placeholder="Nombre del producto"
                />
            </div>
            <div className="field">
                <label>Precio (Q) *</label>
                <input
                value={fPrecio}
                onChange={(e) => setFPrecio(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                />
            </div>
            <div className="field">
                <label>URL de imagen</label>
                <input
                value={fImg}
                onChange={(e) => setFImg(e.target.value)}
                placeholder="https://…"
                />
            </div>
            <div className="field">
                <label>Descripción</label>
                <textarea
                rows={3}
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
                placeholder="Breve descripción"
                />
            </div>
            <div className="actions">
                <button className="btn primary" disabled={createDisabled}>
                Crear producto
                </button>
            </div>
            </form>
        </div>

        {/* estado carga/error */}
        {err && <div className="error">{err}</div>}
        {loading && <div className="muted">Cargando productos…</div>}

        {/* grid productos */}
        {!loading && (
            <div className="cards-grid">
            {filtered.map((p) => (
                <article key={p.id} className="card">
                <div className="thumb-wrap">
                    {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} />
                    ) : (
                    <div className="thumb-placeholder">Sin imagen</div>
                    )}
                </div>
                <div className="card-body">
                    <div className="card-title">
                    <h5 title={p.nombre}>{p.nombre}</h5>
                    <span className="price">Q {p.precio.toFixed(2)}</span>
                    </div>
                    {p.descripcion && (
                    <p className="desc" title={p.descripcion}>
                        {p.descripcion}
                    </p>
                    )}
                </div>
                <div className="card-actions">
                    <button className="btn" onClick={() => openEdit(p)}>
                    Editar
                    </button>
                    <button
                    className="btn danger"
                    onClick={() => setConfirmId(p.id)}
                    >
                    Eliminar
                    </button>
                </div>

                {/* confirmación por tarjeta */}
                {confirmId === p.id && (
                    <div className="confirm">
                    <span>¿Eliminar este producto?</span>
                    <div className="confirm-actions">
                        <button className="btn danger" onClick={() => doDelete(p.id)}>
                        Sí, borrar
                        </button>
                        <button className="btn" onClick={() => setConfirmId(null)}>
                        Cancelar
                        </button>
                    </div>
                    </div>
                )}
                </article>
            ))}

            {!filtered.length && (
                <div className="muted">No hay productos con ese criterio.</div>
            )}
            </div>
        )}

        {/* MODAL EDICIÓN */}
        {editOpen && edit && (
            <div className="modal" onClick={() => setEditOpen(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                <h4>Editar producto</h4>
                <button className="icon" onClick={() => setEditOpen(false)}>✕</button>
                </div>

                <div className="modal-body">
                <div className="edit-grid">
                    <div className="field">
                    <label>Nombre *</label>
                    <input
                        value={edit.nombre}
                        onChange={(e) => setEdit({ ...edit, nombre: e.target.value })}
                        placeholder="Nombre del producto"
                    />
                    </div>
                    <div className="field">
                    <label>Precio (Q) *</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={edit.precio}
                        onChange={(e) =>
                        setEdit({ ...edit, precio: e.target.value })
                        }
                    />
                    </div>
                    <div className="field">
                    <label>URL de imagen</label>
                    <input
                        value={edit.imagen_url}
                        onChange={(e) =>
                        setEdit({ ...edit, imagen_url: e.target.value })
                        }
                        placeholder="https://…"
                    />
                    </div>
                    <div className="preview">
                    {edit.imagen_url ? (
                        <img src={edit.imagen_url} alt="preview" />
                    ) : (
                        <div className="thumb-placeholder">Vista previa</div>
                    )}
                    </div>
                    <div className="field span-2">
                    <label>Descripción</label>
                    <textarea
                        rows={3}
                        value={edit.descripcion}
                        onChange={(e) =>
                        setEdit({ ...edit, descripcion: e.target.value })
                        }
                    />
                    </div>
                </div>
                </div>

                <div className="modal-actions">
                <button className="btn" onClick={() => setEditOpen(false)}>
                    Cancelar
                </button>
                <button className="btn primary" onClick={saveEdit}>
                    Guardar cambios
                </button>
                </div>
            </div>
            </div>
        )}
        </div>
    );
}