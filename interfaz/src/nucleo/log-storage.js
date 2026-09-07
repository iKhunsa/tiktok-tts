/**
 * Log local en localStorage (ultimas 100 entradas) + captura global de
 * errores no manejados del cliente, reenviados a /api/logs/client (el
 * servidor los sube a GlitchTip) con los ultimos ~25 logs locales como
 * contexto de "que venia haciendo el usuario". Portado 1:1 desde
 * index.html; ahora consumido tambien desde otros modulos via logStorage.
 */
class LogStorage {
  constructor(maxEntries = 100) {
    this.key = 'tiktok_tts_logs';
    this.maxEntries = maxEntries;
  }
  addLog(level, source, message, data = null) {
    try {
      const logs = this.getLogs();
      logs.push({ timestamp: new Date().toISOString(), level, source, message, data });
      if (logs.length > this.maxEntries) logs.shift();
      localStorage.setItem(this.key, JSON.stringify(logs));
    } catch (e) { /* localStorage no disponible; se pierde el log local, no es fatal */ }
  }
  getLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '[]');
    } catch (e) {
      return [];
    }
  }
}

export const logStorage = new LogStorage(100);

export function iniciarCapturaErroresCliente() {
  window.addEventListener('error', (e) => {
    logStorage.addLog('error', 'client', e.message || 'Error desconocido');
    fetch('/api/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: e.message, stack: e.error?.stack, source: e.filename, recientes: logStorage.getLogs().slice(-25) }),
    }).catch(() => {});
  });
  window.addEventListener('unhandledrejection', (e) => {
    const message = e.reason?.message || String(e.reason);
    logStorage.addLog('error', 'client', message);
    fetch('/api/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stack: e.reason?.stack, source: 'unhandledrejection', recientes: logStorage.getLogs().slice(-25) }),
    }).catch(() => {});
  });
}
