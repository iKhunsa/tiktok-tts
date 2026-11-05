/**
 * Skins .epik: overlays hechos a medida que el streamer importa como un archivo.
 * La skin se guarda como `epik:<id>` y sus ajustes propios viajan en la URL como `x.<clave>`,
 * para no chocar nunca con los params del overlay.
 */
export const PREFIJO_SKIN = 'epik:';
const PREFIJO_PARAM = 'x.';
const ID_VALIDO = /^[a-z0-9][a-z0-9-]{2,47}$/;

export const esSkinEpik = (skin) => typeof skin === 'string' && skin.startsWith(PREFIJO_SKIN) && ID_VALIDO.test(skin.slice(PREFIJO_SKIN.length));
export const idDeSkin = (skin) => (esSkinEpik(skin) ? skin.slice(PREFIJO_SKIN.length) : null);
export const skinDeEpik = (id) => `${PREFIJO_SKIN}${id}`;

/** Campos propios del manifest en forma de esquema (los lee y escribe query.js como cualquier otro). */
export const esquemaEpik = (campos = []) => campos.map((campo) => ({ ...campo, param: `${PREFIJO_PARAM}${campo.clave}` }));
