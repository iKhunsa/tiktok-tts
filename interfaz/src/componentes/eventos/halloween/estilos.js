/**
 * Movimiento de la escena. Los frames de los sprites viven en hoja-sprite.js;
 * aqui solo se mueven los contenedores (translate/transform/opacity, nunca
 * `all`). `translate` y `transform` se animan por separado para dar a X e Y
 * easings distintos (trayectoria curva).
 */
export const ESTILOS_MOVIMIENTO = `
  /* Parvada: sale de abajo al centro y se dispersa hacia los laterales. */
  .hw-vuelo { position: absolute; left: calc(50% + var(--x0)); bottom: -64px; will-change: transform, translate, scale, opacity;
    animation: hw-sale-x var(--dur) cubic-bezier(0.25, 0.1, 0.45, 1) var(--delay) both,
               hw-sale-y var(--dur) cubic-bezier(0.1, 0.7, 0.3, 1) var(--delay) both,
               hw-acerca var(--dur) cubic-bezier(0.1, 0.7, 0.3, 1) var(--delay) both,
               hw-desvanece var(--dur) linear var(--delay) both; }
  /* Aleteo: sube/baja y se ladea hacia el lado al que vuela (--lado = -1 | 1). */
  .hw-vaiven { animation: hw-aletea 0.25s ease-in-out infinite alternate, hw-ladea 0.25s ease-in-out infinite alternate; }
  @keyframes hw-sale-x { from { translate: 0 0; } to { translate: calc(var(--dx) * 1vw) 0; } }
  @keyframes hw-sale-y { from { transform: translateY(0); } to { transform: translateY(calc(var(--dy) * 1vh)); } }
  @keyframes hw-desvanece { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes hw-acerca { from { scale: 0.7; } to { scale: 1.15; } } /* viene de lejos y se acerca */
  @keyframes hw-ladea { from { rotate: 0deg; } to { rotate: calc(var(--lado) * 6deg); } }
  @keyframes hw-aletea { from { transform: translateY(-6px); } to { transform: translateY(6px); } }

  /* Fantasma: avanza lento por el chat, se desvanece y reaparece una vez. */
  .hw-fantasma { position: absolute; left: var(--x0); top: var(--y); will-change: translate, opacity, filter, scale;
    animation: hw-recorre var(--dur) linear var(--delay) both, hw-aparece var(--dur) linear var(--delay) both; }
  .hw-camina { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.55)); animation: hw-aletea 0.8s ease-in-out infinite alternate; } /* mismo vaiven que los murcielagos, mas pausado */
  @keyframes hw-recorre { from { translate: 0 0; } to { translate: var(--recorrido) 0; } }
  /* Se materializa: de borroso y algo pequeno a nitido, y al reves al desvanecerse. */
  @keyframes hw-aparece {
    0%, 32%, 40%, 70%, 100% { opacity: 0; filter: blur(6px); scale: 0.92; }
    6%, 26%, 46%, 64% { opacity: 1; filter: blur(0); scale: 1; }
  }
  /* Vineta: oscurece los bordes durante el evento, el centro (chat) queda limpio. */
  .hw-vineta { position: absolute; inset: 0; opacity: 0;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.35) 100%);
    animation: hw-vineta var(--dur) cubic-bezier(0.23, 1, 0.32, 1) both; }
  @keyframes hw-vineta { 0% { opacity: 0; } 8%, 88% { opacity: 1; } 100% { opacity: 0; } }
`;
