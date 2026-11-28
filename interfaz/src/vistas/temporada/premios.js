const ARTE = 'img/eventos/winter';

// Monedas que cuesta cada giro. Abrir una Mystery Ball ya ganada no cuesta nada.
export const PRECIO_GIRO = 200;

// Premios del Lucky Drop (datos de ejemplo hasta tener los reales). `id` = clave de texto en temporada.luckyDrop.<id>.
// `icono` va en la casilla, `arte` en el centro al ganar y `peso` solo lo usa el sorteo, nunca el dibujo.
// `arteQuieto` sustituye a un `arte` animado cuando se pide movimiento reducido.
export const PREMIOS = [
  { id: 'coins', icono: `${ARTE}/moneda.webp`, arte: `${ARTE}/monedas-1250.webp`, peso: 70 },
  { id: 'mysteryBall', icono: `${ARTE}/premios/bola-misteriosa.webp`, arte: `${ARTE}/premios/bola-misteriosa-animada.webp`, arteQuieto: `${ARTE}/premios/bola-misteriosa.webp`, peso: 22 },
  { id: 'proUnlock', icono: `${ARTE}/premios/pro-desbloqueado.webp`, arte: `${ARTE}/premios/pro-desbloqueado.webp`, peso: 7 },
  { id: 'ultimatePro', icono: `${ARTE}/premios/pro-definitivo.webp`, arte: `${ARTE}/premios/pro-definitivo.webp`, peso: 1, destacado: true },
];
