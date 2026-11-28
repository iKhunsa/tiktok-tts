/** Contenedor de una pestana de la ventana de temporada. */
export function nuevoPanel(clase) {
  const panel = document.createElement('section');
  panel.className = `temporada-panel ${clase}`;
  return panel;
}
