/**
 * Plantillas propias de los avisos TTS (regalos, entradas, follows, likes,
 * compartidos). Puro: sin DOM ni i18n. Plantilla vacia, con variable
 * desconocida, con llaves sueltas o sin dato para una variable -> se usa el
 * texto estandar (`porDefecto`), que nunca depende de esta logica.
 * Las claves/limite se espejan en features/configuracion/validators.js.
 */
export const ANUNCIO_MAX_LEN = 120;

export const ANUNCIO_VARS = {
  gift: ['usuario', 'regalo', 'cantidad'],
  giftUsd: ['usuario', 'regalo', 'cantidad', 'monto'],
  join: ['usuario'],
  follow: ['usuario'],
  like: ['usuario', 'cantidad'],
  share: ['usuario'],
};

export function sanearPlantilla(raw) {
  return String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, ANUNCIO_MAX_LEN);
}

/** @param {Record<string,string>} plantillas @param {string} evento
 *  @param {Record<string,string|number>} vars @param {() => string} porDefecto */
export function resolverAnuncio(plantillas, evento, vars, porDefecto) {
  try {
    const tpl = sanearPlantilla(plantillas && plantillas[evento]);
    const permitidas = ANUNCIO_VARS[evento];
    if (!tpl || !permitidas || /[{}]/.test(tpl.replace(/\{\w+\}/g, ''))) return porDefecto();
    let valida = true;
    const out = tpl.replace(/\{(\w+)\}/g, (m, k) => {
      if (!permitidas.includes(k) || vars[k] === undefined || vars[k] === null) valida = false;
      return valida ? String(vars[k]) : m;
    }).trim();
    return valida && out ? out : porDefecto();
  } catch (_) {
    return porDefecto();
  }
}
