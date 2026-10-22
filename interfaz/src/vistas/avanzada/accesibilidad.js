/** Aplica a11y al DOM de esta misma pagina (zoom + alto contraste). Los
 * ajustes se editan en el modal "Mi cuenta" > Accesibilidad; esta vista solo
 * los respeta. */
export function applyA11ySelf(cfg) {
  if (cfg.a11yUiFontScale) document.body.style.zoom = cfg.a11yUiFontScale;
  document.body.classList.toggle('high-contrast', !!cfg.a11yHighContrast);
}
