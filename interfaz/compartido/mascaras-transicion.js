// Transiciones de mascara al estilo de los "luma wipe" de OBS. Cada una es un campo f(u, v) en [0, 1] sobre el lienzo
// (u: izquierda a derecha, v: arriba a abajo) que dice cuando se revela cada punto: 0 = primero, 1 = ultimo.

const ASPECTO = 16 / 9;
const frac = (x) => x - Math.floor(x);
const triangulo = (x) => Math.abs(frac(x) * 2 - 1);
const limitar = (x) => Math.min(1, Math.max(0, x));
const radio = (u, v) => Math.hypot((u - 0.5) * ASPECTO, v - 0.5) / Math.hypot(ASPECTO / 2, 0.5); // 0 centro, 1 esquina
const anguloDesdeCentro = (u, v) => Math.atan2(v - 0.5, (u - 0.5) * ASPECTO);

// Ruido de valor determinista (sin Math.random: la misma transicion se ve igual siempre).
const azar = (i, j, semilla) => frac(Math.sin(i * 127.1 + j * 311.7 + semilla * 74.7) * 43758.5453);
const suave = (t) => t * t * (3 - 2 * t);
function ruido(x, y, semilla) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = suave(x - i);
  const fy = suave(y - j);
  const arriba = azar(i, j, semilla) * (1 - fx) + azar(i + 1, j, semilla) * fx;
  const abajo = azar(i, j + 1, semilla) * (1 - fx) + azar(i + 1, j + 1, semilla) * fx;
  return arriba * (1 - fy) + abajo * fy;
}
function ruidoFractal(x, y, semilla, octavas) {
  let suma = 0;
  let amplitud = 0.5;
  for (let octava = 0; octava < octavas; octava++) {
    suma += amplitud * ruido(x * 2 ** octava, y * 2 ** octava, semilla + octava);
    amplitud /= 2;
  }
  return suma;
}
const estirar = (valor) => limitar((valor - 0.2) / 0.6); // el ruido se concentra en el centro: se estira para usar todo el rango

export const MASCARAS = {
  'barndoor-bottom-left': (u, v) => Math.atan2(1 - v, u * ASPECTO) / (Math.PI / 2),
  'barndoor-horizontal': (u, v) => Math.abs(v - 0.5) * 2,
  'barndoor-top-left': (u, v) => Math.atan2(v, u * ASPECTO) / (Math.PI / 2),
  'barndoor-vertical': (u) => Math.abs(u - 0.5) * 2,
  'blinds-horizontal': (u, v) => frac(v * 8),
  'box-bottom-left': (u, v) => Math.max(u, 1 - v),
  'box-bottom-right': (u, v) => Math.max(1 - u, 1 - v),
  'box-top-left': (u, v) => Math.max(u, v),
  'box-top-right': (u, v) => Math.max(1 - u, v),
  burst: (u, v) => limitar(radio(u, v) * 0.75 + 0.25 * (0.5 + 0.5 * Math.cos(anguloDesdeCentro(u, v) * 16))),
  'checkerboard-small': (u, v) => {
    const distancia = Math.hypot(frac(u * 16) - 0.5, frac(v * 9) - 0.5) * Math.SQRT2;
    return (Math.floor(u * 16) + Math.floor(v * 9)) % 2 * 0.5 + distancia * 0.5;
  },
  circles: (u, v) => limitar(Math.hypot(frac(u * 8) - 0.5, frac(v * 5) - 0.5) * Math.SQRT2 * 0.85 + 0.15 * azar(Math.floor(u * 8), Math.floor(v * 5), 1)),
  clock: (u, v) => frac(Math.atan2((u - 0.5) * ASPECTO, -(v - 0.5)) / (2 * Math.PI)),
  cloud: (u, v) => estirar(ruidoFractal(u * 4 * ASPECTO, v * 4, 1, 4)),
  curtain: (u, v) => limitar(Math.abs(u - 0.5) * 2 * 0.93 + 0.07 * (0.5 + 0.5 * Math.sin(v * Math.PI * 14))),
  fan: (u, v) => (Math.atan2((u - 0.5) * ASPECTO, 1 - v) + Math.PI / 2) / Math.PI,
  fractal: (u, v) => estirar(1 - Math.abs(2 * ruidoFractal(u * 6 * ASPECTO, v * 6, 7, 5) - 1) * 1.4 + 0.1),
  iris: (u, v) => radio(u, v),
  'linear-horizontal': (u) => u,
  'linear-top-left': (u, v) => (u + v) / 2,
  'linear-top-right': (u, v) => (1 - u + v) / 2,
  'linear-vertical': (u, v) => v,
  'parallel-zigzag-horizontal': (u, v) => u * 0.9 + 0.1 * triangulo(v * 6),
  'parallel-zigzag-vertical': (u, v) => v * 0.9 + 0.1 * triangulo(u * 10),
  'sinus-9': (u, v) => u * 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(v * 2 * Math.PI * 9)),
  spiral: (u, v) => frac(anguloDesdeCentro(u, v) / (2 * Math.PI) + radio(u, v) * 2.5),
  square: (u, v) => Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2,
  squares: (u, v) => limitar(Math.max(Math.abs(frac(u * 8) - 0.5), Math.abs(frac(v * 5) - 0.5)) * 2 * 0.85 + 0.15 * azar(Math.floor(u * 8), Math.floor(v * 5), 2)),
  stripes: (u) => frac(u * 10),
  'strips-horizontal': (u, v) => (Math.floor(v * 8) % 2 ? 1 - u : u),
  'strips-vertical': (u, v) => (Math.floor(u * 12) % 2 ? 1 - v : v),
  watercolor: (u, v) => estirar(ruidoFractal(u * 2.2 * ASPECTO, v * 2.2, 3, 3)),
  'zigzag-horizontal': (u, v) => { const fila = Math.floor(v * 8); return (fila + (fila % 2 ? 1 - u : u)) / 8; },
  'zigzag-vertical': (u, v) => { const columna = Math.floor(u * 12); return (columna + (columna % 2 ? 1 - v : v)) / 12; },
};

export const TIPOS_MASCARA = Object.keys(MASCARAS);

const cache = new Map();
/** El campo de una mascara muestreado en `ancho` x `alto` (Float32Array en [0, 1], fila por fila). Se calcula una vez. */
export function campoDeMascara(tipo, ancho, alto) {
  const clave = `${tipo}:${ancho}x${alto}`;
  if (!cache.has(clave)) {
    const campo = new Float32Array(ancho * alto);
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) campo[y * ancho + x] = limitar(MASCARAS[tipo]((x + 0.5) / ancho, (y + 0.5) / alto));
    }
    cache.set(clave, campo);
  }
  return cache.get(clave);
}
