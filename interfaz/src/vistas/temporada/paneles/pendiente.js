/**
 * Recuadro gris para el arte que todavia no existe (cofre, maquina de garra, overlays, iconos...). Se reemplaza por
 * la imagen real sin tocar el diseno del panel: el contenedor ya tiene el tamano final.
 */
export const htmlPendiente = (clave, clase = '') => `<div class="temporada-pendiente ${clase}" aria-hidden="true" data-pendiente="${clave}"><span data-i18n="temporada.pendiente.${clave}"></span></div>`;

export function nuevoPanel(clase) {
  const panel = document.createElement('section');
  panel.className = `temporada-panel ${clase}`;
  return panel;
}
