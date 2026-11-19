import { DEFAULTS_OVERLAYS } from './esquemas.js';

/** Congela las capas antiguas antes de independizarlas del catalogo. No borra escenas ni paquetes. */
export function migrarDominiosOverlay(datos) {
  if (datos.versionDominiosOverlay === 1) return datos;
  const anteriores = datos.overlays || {};
  datos.capasGif = { ...datos.capasGif };
  for (const [id, cfg] of Object.entries(anteriores)) {
    if (id.startsWith('gif:')) {
      datos.capasGif[id] = globalThis.structuredClone(cfg);
      delete anteriores[id];
    } else {
      cfg.epik = globalThis.structuredClone(cfg.epik || datos.epik || {});
    }
  }
  datos.escenas = (datos.escenas || []).map((original) => {
    const escena = Array.isArray(original) ? { ids: original, nombres: {} } : original;
    const ajustes = Object.fromEntries((escena.ids || []).map((id) => {
      const base = { ...DEFAULTS_OVERLAYS[id], ...(anteriores[id] || datos.capasGif[id]) };
      return [id, globalThis.structuredClone({ ...base, ...escena.ajustes?.[id] })];
    }));
    return { ...escena, ajustes, formato: escena.formato || datos.overlayLienzo || '16:9' };
  });
  delete datos.epik;
  datos.versionDominiosOverlay = 1;
  return datos;
}
