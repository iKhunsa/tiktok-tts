// Evento de uso de UI → analítica de producto (Aptabase). Pasa por IPC con lista
// blanca (preload.js + electron-shell/ipc-bridge.js); el valor es de lista cerrada
// y lo valida electron-shell/aptabase.js. No-op fuera de Electron.
export function trackUi(evento, valor) {
  try { window.electronAPI?.trackEvent?.(evento, valor); } catch (_) { /* noop */ }
}
