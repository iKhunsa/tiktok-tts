/** Mismo criterio que el resto de la app: ajuste del SO o setting a11y propio. */
export function prefiereMovimientoReducido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.body.classList.contains('reduce-motion');
}
