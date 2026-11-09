/**
 * Ajustes de un overlay tal como se APLICAN con el plan del usuario.
 *
 * Los ajustes guardados pueden traer una skin premium de varias formas (la
 * eligio con Pro y despues lo perdio, la dejo puesta el editor de canvas, un
 * respaldo de otra sesion...). Sin acceso Pro esa skin no debe salir hacia
 * OBS, la vista previa ni la escena del canvas: cae al default del esquema.
 *
 * El valor guardado NO se toca: si despues compra Pro, vuelve a aplicarse.
 * Los .epik importados no son Pro y no estan en `premium`, asi que pasan.
 *
 * @param {object[]} esquema  campos del overlay (compartido/estilo/campos-*.js)
 * @param {object} ajustes    valores guardados del overlay
 * @param {boolean} conAcceso  true si el plan incluye lo Pro (o no hay sistema de cuentas)
 * @returns {object} `ajustes` tal cual, o una copia con la skin corregida (nunca muta el original)
 */
export function ajustesSegunPlan(esquema, ajustes, conAcceso) {
  if (conAcceso) return ajustes;
  const skin = esquema.find((campo) => campo.clave === 'skin');
  if (!skin?.premium?.includes(ajustes.skin)) return ajustes;
  return { ...ajustes, skin: skin.def };
}
