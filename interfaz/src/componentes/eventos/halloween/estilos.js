/**
 * Movimiento de la escena. Los frames de los sprites viven en hoja-sprite.js;
 * aqui solo se mueven los contenedores (translate/transform/opacity, nunca
 * `all`). `translate` y `transform` se animan por separado para dar a X e Y
 * easings distintos (trayectoria curva).
 */
export const ESTILOS_MOVIMIENTO = `
  /* Parvada: sale de abajo al centro y se dispersa hacia los laterales. */
  .hw-vuelo { position: absolute; left: calc(50% + var(--x0)); bottom: -64px; will-change: transform, translate, opacity;
    animation: hw-sale-x var(--dur) cubic-bezier(0.25, 0.1, 0.45, 1) var(--delay) both,
               hw-sale-y var(--dur) cubic-bezier(0.1, 0.7, 0.3, 1) var(--delay) both,
               hw-desvanece var(--dur) linear var(--delay) both; }
  .hw-vaiven { animation: hw-aletea 0.25s ease-in-out infinite alternate; }
  @keyframes hw-sale-x { from { translate: 0 0; } to { translate: calc(var(--dx) * 1vw) 0; } }
  @keyframes hw-sale-y { from { transform: translateY(0); } to { transform: translateY(calc(var(--dy) * 1vh)); } }
  @keyframes hw-desvanece { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes hw-aletea { from { transform: translateY(-6px); } to { transform: translateY(6px); } }

  /* Fantasma: avanza lento por el chat, se desvanece por tramos y reaparece mas adelante. */
  .hw-fantasma { position: absolute; left: var(--x0); top: var(--y); will-change: translate, opacity;
    animation: hw-recorre var(--dur) linear var(--delay) both, hw-aparece var(--dur) linear var(--delay) both; }
  .hw-camina { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.55)); animation: hw-paso 0.8s ease-in-out infinite alternate; }
  @keyframes hw-recorre { from { translate: 0 0; } to { translate: var(--recorrido) 0; } }
  @keyframes hw-aparece {
    0% { opacity: 0; } 6% { opacity: 1; } 26% { opacity: 1; } 32% { opacity: 0; }
    40% { opacity: 0; } 46% { opacity: 1; } 64% { opacity: 1; } 70% { opacity: 0; }
    78% { opacity: 0; } 84% { opacity: 1; } 94% { opacity: 1; } 100% { opacity: 0; }
  }
  @keyframes hw-paso { from { transform: translateY(0); } to { transform: translateY(-9px); } }
`;
