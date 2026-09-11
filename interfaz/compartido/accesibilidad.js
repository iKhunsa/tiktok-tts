/**
 * Aplica la config de accesibilidad del servidor a un overlay. Reemplaza
 * las 8 copias de applyA11yConfig()+fetch('/api/config') que cerraban
 * cada script de overlay.
 *
 * @param {(reduceMotion: boolean) => void} [onCambio] - callback opcional
 *   para overlays que ademas guardan el flag en una variable propia.
 */
export function iniciarAccesibilidadOverlay(onCambio) {
  function aplicar(cfg) {
    const reduceMotion = !!(cfg && cfg.a11yReduceMotion);
    document.body.classList.toggle('reduce-motion', reduceMotion);
    if (onCambio) onCambio(reduceMotion);
  }
  fetch('/api/config').then((r) => r.json()).then(aplicar).catch(() => {});
  return aplicar;
}
