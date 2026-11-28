/**
 * Movimiento de la escena. Los frames de los sprites viven en hoja-sprite.js; aqui solo se mueven los contenedores
 * (translate/transform/opacity, nunca `all`).
 */
export const ESTILOS_NAVIDAD = `
  /* La escena entra y sale fundida; la vineta fria oscurece los bordes y deja limpio el centro. */
  .nv-escena { position: absolute; inset: 0; opacity: 0;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(10, 28, 56, 0.45) 100%);
    animation: nv-escena var(--dur) cubic-bezier(0.23, 1, 0.32, 1) both; }
  @keyframes nv-escena { 0% { opacity: 0; } 8%, 92% { opacity: 1; } 100% { opacity: 0; } }

  /* Trineo: viaja a velocidad constante de un extremo al otro de su recorrido. */
  .nv-trineo { position: absolute; left: 0; top: 0; z-index: 2; will-change: translate;
    animation: nv-viaja var(--vuelo) linear var(--retraso) both; }
  @keyframes nv-viaja { from { translate: var(--x0) var(--y0); } to { translate: var(--x1) var(--y1); } }
  /* Se mece como si volara, de lado respecto a la marcha. */
  .nv-vaiven { animation: nv-mece 0.9s ease-in-out infinite alternate; }
  @keyframes nv-mece { from { transform: translate(calc(-1 * var(--mx)), calc(-1 * var(--my))); } to { transform: translate(var(--mx), var(--my)); } }
  .nv-vaiven > .nv-trineo-hoja { image-rendering: auto; } /* se muestra reducido: sin suavizado el borde parpadea */
`;
