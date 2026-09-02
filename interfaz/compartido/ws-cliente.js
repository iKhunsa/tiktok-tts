/**
 * Cliente WS unico para los overlays vanilla. Reemplaza las 9 copias de
 * connectWS con 3 politicas de backoff distintas que existian en los 7
 * overlays + mobile.html (index.html tiene su propio cliente en
 * interfaz/src/nucleo/ws/, con reintentos limitados a MAX_WS_RECONNECT
 * porque ademas pinta un estado de error en la UI principal).
 *
 * Backoff: arranca en 2000ms, se duplica en cada cierre hasta un tope de
 * 30000ms — es la politica que ya usaban overlay-likes/seguidores/etc.
 *
 * @param {(data: any) => void} onMensaje - se llama con el objeto ya parseado
 * @param {{onOpen?: () => void}} [opts]
 */
export function conectarWSOverlay(onMensaje, opts = {}) {
  let ws = null;
  let retryDelay = 2000;

  function conectar() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}`);
    ws.onopen = () => {
      retryDelay = 2000;
      if (opts.onOpen) opts.onOpen();
    };
    ws.onmessage = (e) => {
      try {
        onMensaje(JSON.parse(e.data));
      } catch (_) { /* mensaje no parseable, se ignora */ }
    };
    ws.onclose = () => {
      setTimeout(conectar, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    };
    ws.onerror = () => ws.close();
  }

  conectar();
  return { get socket() { return ws; } };
}
