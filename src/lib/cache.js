const cache = new Map();

export function readCache(key) {
  const hit = cache.get(key);

  if (!hit) {
    return null;
  }

  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return hit.value;
}

export function writeCache(key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}
