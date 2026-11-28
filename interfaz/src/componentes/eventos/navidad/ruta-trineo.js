/**
 * Recorrido del trineo al azar (datos puros, sin DOM): por X, hacia la derecha o la izquierda, o por Y, subiendo o
 * bajando, siempre entrando y saliendo por completo de la ventana. El dibujo mira a la derecha: `orientacion` lo voltea
 * o lo gira para que avance de frente. `mece` es el vaiven, perpendicular a la marcha. `azar` es inyectable.
 */
export const SENTIDOS = ['derecha', 'izquierda', 'arriba', 'abajo'];
const DERIVA = 0.12; // cuanto puede subir o bajar un vuelo horizontal, en fraccion del alto
const MECE_PX = 4;

const entre = (azar, min, max) => min + azar() * (max - min);

function rutaHorizontal(sentido, vista, trineo, azar) {
  const y = entre(azar, 0.1, 0.7) * vista.height;
  const deriva = entre(azar, -DERIVA, DERIVA) * vista.height;
  const fuera = [-trineo.ancho, vista.width];
  const [x0, x1] = sentido === 'derecha' ? fuera : [...fuera].reverse();
  const inclinacion = (Math.atan2(deriva, vista.width + trineo.ancho) * 180) / Math.PI;
  const espejo = sentido === 'derecha' ? '' : 'scaleX(-1) ';
  return { desde: { x: x0, y }, hasta: { x: x1, y: y + deriva }, orientacion: `${espejo}rotate(${inclinacion.toFixed(1)}deg)`, mece: { x: 0, y: MECE_PX } };
}

function rutaVertical(sentido, vista, trineo, azar) {
  // Girado 90 grados, lo que ocupa en vertical es su ancho; el centro de la caja no se mueve al girar.
  const x = entre(azar, 0.15, 0.85) * vista.width - trineo.ancho / 2;
  const centros = [vista.height + trineo.ancho / 2, -trineo.ancho / 2]; // de abajo a arriba
  const [y0, y1] = (sentido === 'arriba' ? centros : [...centros].reverse()).map((centro) => centro - trineo.alto / 2);
  return { desde: { x, y: y0 }, hasta: { x, y: y1 }, orientacion: `rotate(${sentido === 'arriba' ? -90 : 90}deg)`, mece: { x: MECE_PX, y: 0 } };
}

export function generarRuta(vista, trineo, azar = Math.random) {
  const sentido = SENTIDOS[Math.floor(azar() * SENTIDOS.length)];
  const trazar = sentido === 'derecha' || sentido === 'izquierda' ? rutaHorizontal : rutaVertical;
  return { sentido, ...trazar(sentido, vista, trineo, azar) };
}
