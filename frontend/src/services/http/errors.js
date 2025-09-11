export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? 0;
    this.code = code ?? null;
    this.details = details ?? null;
  }
}

export async function fromResponse(res) {
  let payload;
  try { payload = await res.json(); } catch (_) { payload = null; }
  const message = payload?.message || `HTTP ${res.status}`;
  return new ApiError(message, {
    status: res.status,
    code: payload?.code,
    details: payload,
  });
}
