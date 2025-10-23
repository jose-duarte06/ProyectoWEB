import time
from fastapi import HTTPException

# Nota: en producción usa Redis/Memcached. Esto es en-memoria para 1 proceso.
_BUCKETS: dict[str, dict] = {}

def rate_limit(key: str, limit: int = 5, window: int = 60):
    """
    Lanza HTTP 429 si se excede `limit` dentro de `window` segundos para la clave `key`.
    """
    now = time.time()
    b = _BUCKETS.get(key)
    if not b or now - b["start"] >= window:
        _BUCKETS[key] = {"start": now, "count": 1}
        return
    b["count"] += 1
    if b["count"] > limit:
        # Opcional: incluye Retry-After si quieres
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta más tarde.")
