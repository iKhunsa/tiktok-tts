'use strict';

// Cliente HTTP hacia servicio-cuentas. fetch nativo + AbortSignal.timeout +
// 2 reintentos ante red/timeout (no ante 4xx). Patron features/telemetria/transport.js.
// Devuelve { ok, status, body }.

const TIMEOUT_MS = 8000;
const REINTENTOS = 2;

function crearCliente(baseUrl) {
  async function pedir(pathRel, { method = 'GET', body, token } = {}) {
    const url = `${baseUrl}${pathRel}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let ultimoError;
    for (let intento = 0; intento <= REINTENTOS; intento++) {
      try {
        const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT_MS) });
        const text = await res.text();
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = text; }
        // 4xx: respuesta valida del servicio, no reintentar.
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          return { ok: res.ok, status: res.status, body: parsed };
        }
        ultimoError = new Error(`servicio-cuentas ${res.status}`);
      } catch (err) {
        ultimoError = err;
      }
      if (intento < REINTENTOS) await new Promise((r) => setTimeout(r, [500, 2000][intento] || 2000));
    }
    return { ok: false, status: 0, body: null, error: ultimoError };
  }

  return {
    register: (b) => pedir('/api/auth/register', { method: 'POST', body: b }),
    login: (b) => pedir('/api/auth/login', { method: 'POST', body: b }),
    logout: (token) => pedir('/api/auth/logout', { method: 'POST', token }),
    session: (token) => pedir('/api/session', { token }),
    account: (token, b) => pedir('/api/account', { method: 'PATCH', token, body: b }),
    checkout: (token, b) => pedir('/api/checkout', { method: 'POST', token, body: b }),
  };
}

module.exports = { crearCliente };
