/** Rueda del mouse sobre `el` avanza (+1) o retrocede (-1) un carrusel; con pausa para no saltar varios de golpe. */
export function ruedaCarrusel(el, mover, pausaMs = 450) {
  let ultimo = 0;
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const ahora = Date.now();
    if (ahora - ultimo < pausaMs || !e.deltaY) return;
    ultimo = ahora;
    mover(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
}
