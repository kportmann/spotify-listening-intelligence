const store = new Map();

export function makeKey({ method, url, body }) {
  return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
}

export function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  const { expiresAt, value } = entry;
  if (expiresAt && Date.now() > expiresAt) {
    store.delete(key);
    return null;
  }
  return value;
}

export function set(key, value, ttlMs) {
  const expiresAt = ttlMs ? Date.now() + ttlMs : null;
  store.set(key, { value, expiresAt });
}

export function del(key) {
  store.delete(key);
}

export function clear() {
  store.clear();
}
