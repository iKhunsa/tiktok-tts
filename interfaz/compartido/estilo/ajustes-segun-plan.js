export const skinAdquirida = (skin, adquiridas = [], licencias = {}) => adquiridas.includes(`skin:${skin}`) || licencias[skin] === 'adquirida';

/** Derechos procedentes de la sesion del servidor, nunca del paquete ni de los ajustes guardados. */
export function skinPermitida(esquema, skin, conAcceso, adquiridas = [], licencias = {}) {
  if (conAcceso || skinAdquirida(skin, adquiridas, licencias)) return true;
  if (licencias[skin] === 'pro') return false;
  return !esquema.find((campo) => campo.clave === 'skin')?.premium?.includes(skin);
}

/** Aplica el derecho actual sin borrar el diseno guardado para una futura renovacion. */
export function ajustesSegunPlan(esquema, ajustes, conAcceso, adquiridas = [], licencias = {}) {
  if (skinPermitida(esquema, ajustes.skin, conAcceso, adquiridas, licencias)) return ajustes;
  return { ...ajustes, skin: esquema.find((campo) => campo.clave === 'skin').def };
}
