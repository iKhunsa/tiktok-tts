'use strict';

// Cliente HTTP hacia servicio-cuentas. fetch nativo + AbortSignal.timeout.
// Solo session() reintenta (es el chequeo de fondo; un falso "deslogueado"
// molesta). Las acciones del usuario (login/register/...) van one-shot: si
// falla, re-clickea. Devuelve { ok, status, body }.

const TIMEOUT_MS = 8000;

function crearCliente(baseUrl) {
  async function pedir(pathRel, { method = 'GET', body, token, reintentos = 0 } = {}) {
    const url = `${baseUrl}${pathRel}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let ultimoError;
    for (let intento = 0; intento <= reintentos; intento++) {
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
      if (intento < reintentos) await new Promise((r) => setTimeout(r, [500, 2000][intento]));
    }
    return { ok: false, status: 0, body: null, error: ultimoError };
  }

  return {
    register: (b) => pedir('/api/auth/register', { method: 'POST', body: b }),
    login: (b) => pedir('/api/auth/login', { method: 'POST', body: b }),
    logout: (token) => pedir('/api/auth/logout', { method: 'POST', token }),
    session: (token) => pedir('/api/session', { token, reintentos: 2 }),
    account: (token, b) => pedir('/api/account', { method: 'PATCH', token, body: b }),
    checkout: (token, b) => pedir('/api/checkout', { method: 'POST', token, body: b }),
    cancelarSuscripcion: (token) => pedir('/api/subscription/cancel', { method: 'POST', token }),
    reanudarSuscripcion: (token) => pedir('/api/subscription/resume', { method: 'POST', token }),
  };
}

module.exports = { crearCliente };
