/**
 * Reenvia errores no manejados de un overlay a /api/logs/client (de ahi
 * el backend los sube a GlitchTip). Estaba copiado al inicio de cada
 * overlay-*.html.
 */
let registrado = false;

export function registrarErroresOverlay() {
  if (registrado) return; // un .epik que cae al overlay de siempre llega aqui dos veces
  registrado = true;
  const enviar = (message, stack) => {
    fetch('/api/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message || 'Error desconocido', stack, source: 'overlay:' + location.pathname }),
    }).catch(() => {});
  };

  window.addEventListener('error', (e) => enviar(e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason || {};
    enviar(r.message || String(e.reason), r.stack);
  });
}
