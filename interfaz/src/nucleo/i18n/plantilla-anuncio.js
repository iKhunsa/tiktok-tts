/**
 * Plantillas propias de los avisos TTS (regalos, entradas, follows, likes,
 * compartidos). Puro: sin DOM ni i18n. El usuario escribe solo una frase
 * ("se la comio") y aqui se antepone el nombre y se agregan los datos del
 * evento. Plantillas viejas con {usuario}/{cantidad}/{regalo}/{monto} siguen
 * funcionando. Vacia, con llaves invalidas o sin dato -> texto estandar
 * (`porDefecto`), que nunca depende de esta logica.
 * Las claves/limite se espejan en features/configuracion/validators.js.
 */
export const ANUNCIO_MAX_LEN = 120;

// Variables permitidas en plantillas viejas (compat).
export const ANUNCIO_VARS = {
  gift: ['usuario', 'regalo', 'cantidad'],
  giftUsd: ['usuario', 'regalo', 'cantidad', 'monto'],
  join: ['usuario'],
  follow: ['usuario'],
  like: ['usuario', 'cantidad'],
  share: ['usuario'],
};

// Datos que se agregan solos tras la frase, segun el evento.
const EXTRAS = {
  gift: (v) => [v.cantidad, v.regalo, v.monto ? `${v.monto} USD` : ''],
  like: (v) => [v.cantidad],
};

export function sanearPlantilla(raw) {
  return String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, ANUNCIO_MAX_LEN);
}

/** @param {Record<string,string>} plantillas @param {string} evento
 *  @param {Record<string,string|number>} vars @param {() => string} porDefecto */
export function resolverAnuncio(plantillas, evento, vars, porDefecto) {
  try {
    const ev = evento === 'giftUsd' ? 'gift' : evento; // el monto se suma a la frase de "gift"
    const tpl = sanearPlantilla(plantillas && (plantillas[evento] || plantillas[ev]));
    const permitidas = ANUNCIO_VARS[evento];
    if (!tpl || !permitidas || /[{}]/.test(tpl.replace(/\{\w+\}/g, ''))) return porDefecto();
    if (!/\{\w+\}/.test(tpl)) { // frase simple: nombre + frase + datos
      if (vars.usuario === undefined || vars.usuario === null) return porDefecto();
      const extras = (EXTRAS[ev]?.(vars) || []).filter((x) => x !== undefined && x !== null && x !== '');
      return `${vars.usuario} ${tpl}${extras.length ? `, ${extras.join(' ')}` : ''}`;
    }
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
