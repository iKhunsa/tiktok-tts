const CLAVE = 'tikliveTTS_novedades';
const VIGENCIA_MS = 4 * 24 * 60 * 60 * 1000;

/**
 * ¿El botón de novedades se muestra expandido? Sí durante 4 días desde la
 * primera vez que esta versión se abre en esta instalación; después, solo ícono.
 */
export function novedadVigente(version, ahora = Date.now(), storage = globalThis.localStorage) {
  let guardado = null;
  try { guardado = JSON.parse(storage.getItem(CLAVE)); } catch (_) { /* sin storage o JSON roto: se reinicia abajo */ }
  if (!guardado || guardado.version !== version) {
    guardado = { version, desde: ahora };
    try { storage.setItem(CLAVE, JSON.stringify(guardado)); } catch (_) { /* sin persistencia: expande esta sesión */ }
  }
  return ahora - guardado.desde < VIGENCIA_MS;
}
