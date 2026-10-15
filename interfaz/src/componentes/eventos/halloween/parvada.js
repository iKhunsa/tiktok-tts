/**
 * Genera la parvada (datos puros, sin DOM): mitad sale hacia cada lateral con
 * destino, tamano y tiempos aleatorios. `azar` es inyectable para testear.
 * dx en vw (signo = lado), dy en vh (negativo = hacia arriba), x0 en px.
 */
const CANTIDAD = 24;
const TAMANOS = [
  { hasta: 0.17, ancho: 16 }, // "uno que otro" pequeno
  { hasta: 0.67, ancho: 32 },
  { hasta: 1, ancho: 48 },
]; // multiplos de 16: el arte es de 16 px por "pixel"

const entre = (azar, min, max) => min + azar() * (max - min);

function anchoAleatorio(azar) {
  const r = azar();
  return TAMANOS.find((t) => r < t.hasta).ancho;
}

function crearMurcielago(indice, azar) {
  const lado = indice % 2 === 0 ? -1 : 1;
  return {
    ancho: anchoAleatorio(azar),
    x0: entre(azar, -40, 40),
    dx: lado * entre(azar, 30, 75),
    dy: -entre(azar, 10, 85),
    dur: entre(azar, 1.6, 3),
    delay: entre(azar, 0, 1),
    desfaseAleteo: entre(azar, 0, 0.67),
  };
}

export function generarParvada(azar = Math.random, cantidad = CANTIDAD) {
  return Array.from({ length: cantidad }, (_, i) => crearMurcielago(i, azar));
}
