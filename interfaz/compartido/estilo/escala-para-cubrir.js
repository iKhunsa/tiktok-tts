/** Media parte de 20vw: conserva la proporcion y cubre ambos ejes del lienzo. */
export function escalaParaCubrir(ancho, alto, anchoLienzo, altoLienzo) {
  return Math.max(1, altoLienzo * ancho / (anchoLienzo * alto)) / 0.2;
}
