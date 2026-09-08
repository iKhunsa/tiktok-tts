'use strict';

// Contrato sincrono inyectado por features/auth/. Otros dominios lo consumen
// para gatear features Pro:  if (!entitlements.check('bot-musical')) return;
//
// Singleton require-once (mismo idiom que mcp-registry.js / perf.js). Hasta que
// features/auth/ llame provide(), check() respeta el default: todo desbloqueado.
//
// Reglas:
//  - subscriptionsEnabled === false  -> siempre true (comportamiento actual)
//  - subscriptionsEnabled === true   -> sesion.entitlements.includes(featureId)
//  - si _impl lanza                  -> false (FAIL-SAFE: bloquea)

let _impl = null;

function provide(fn) {
  _impl = fn;
}

function check(featureId) {
  if (!_impl) return true; // features/auth/ todavia no monto (o esta en no-op)
  try {
    return _impl(featureId) === true;
  } catch (_) {
    return false;
  }
}

module.exports = { provide, check };
