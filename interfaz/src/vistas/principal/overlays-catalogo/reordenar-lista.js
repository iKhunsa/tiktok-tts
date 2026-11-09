/**
 * Hace arrastrables las filas de una lista para reordenarlas de arriba a abajo (arrastre nativo).
 * `alMover(desde, hasta)` recibe los indices de fila; la linea .destino-arriba/.destino-abajo marca donde caera.
 */
export function hacerReordenable(filas, alMover) {
  let origen = -1;
  const limpiar = () => filas.forEach((fila) => fila.classList.remove('arrastrando', 'destino-arriba', 'destino-abajo'));
  filas.forEach((fila, i) => {
    fila.draggable = true;
    fila.addEventListener('dragstart', (evento) => {
      origen = i;
      evento.dataTransfer.effectAllowed = 'move';
      evento.dataTransfer.setData('text/plain', String(i)); // Firefox/Chromium exigen datos para iniciar el arrastre
      fila.classList.add('arrastrando');
    });
    fila.addEventListener('dragover', (evento) => {
      if (origen < 0) return;
      evento.preventDefault();
      const mitad = fila.getBoundingClientRect().top + fila.offsetHeight / 2;
      filas.forEach((otra) => otra.classList.remove('destino-arriba', 'destino-abajo'));
      fila.classList.add(evento.clientY < mitad ? 'destino-arriba' : 'destino-abajo');
    });
    fila.addEventListener('drop', (evento) => {
      if (origen < 0) return;
      evento.preventDefault();
      const antes = evento.clientY < fila.getBoundingClientRect().top + fila.offsetHeight / 2;
      let hasta = i + (antes ? 0 : 1);
      if (origen < hasta) hasta -= 1; // al quitar la fila de origen, los de abajo suben un puesto
      const desde = origen;
      origen = -1;
      limpiar();
      if (hasta !== desde) alMover(desde, hasta);
    });
    fila.addEventListener('dragend', () => { origen = -1; limpiar(); });
  });
}
