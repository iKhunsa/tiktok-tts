const DURACION_MS = 600;
const easeOut = (progreso) => 1 - (1 - progreso) ** 3;

/** Cuenta de `desde` a `hasta` en el elemento; `formatear` convierte cada paso a texto. */
export function animarNumero(elemento, desde, hasta, formatear) {
  const inicio = performance.now();

  function paso(ahora) {
    const progreso = Math.min((ahora - inicio) / DURACION_MS, 1);
    elemento.textContent = formatear(Math.round(desde + (hasta - desde) * easeOut(progreso)));
    if (progreso < 1) requestAnimationFrame(paso);
  }

  requestAnimationFrame(paso);
}
