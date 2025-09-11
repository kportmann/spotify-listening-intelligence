import { fromResponse } from './errors';
import * as cache from './cache';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

function buildUrl(path, params) {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function fetchJson(method, path, { params, body, headers, signal, cacheTtlMs, bypassCache } = {}) {
  const url = buildUrl(path, params);
  const key = cache.makeKey({ method, url, body });

  if (method === 'GET' && cacheTtlMs && !bypassCache) {
    const cached = cache.get(key);
    if (cached) return cached;
  }

  const resp = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!resp.ok) {
    throw await fromResponse(resp);
  }

  const data = await resp.json();

  if (method === 'GET' && cacheTtlMs && !bypassCache) {
    cache.set(key, data, cacheTtlMs);
  }

  return data;
}

export const http = {
  get: (path, options) => fetchJson('GET', path, options),
  post: (path, options) => fetchJson('POST', path, options),
  put: (path, options) => fetchJson('PUT', path, options),
  del: (path, options) => fetchJson('DELETE', path, options),
  buildUrl,
};
