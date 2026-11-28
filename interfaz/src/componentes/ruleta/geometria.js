// Geometria de la ruleta (sin DOM). Angulos en grados, en sentido horario y con 0 = arriba, donde esta el indicador.

const modulo = (valor, base) => ((valor % base) + base) % base;
const redondear = (valor) => Math.round(valor * 100) / 100;

export function punto(radio, grados) {
  const radianes = (grados * Math.PI) / 180;
  return `${redondear(radio * Math.sin(radianes))} ${redondear(-radio * Math.cos(radianes))}`;
}

/** Trazado SVG de un sector de anillo centrado arriba, de `apertura` grados, entre dos radios. */
export function rutaSegmento(radioInterior, radioExterior, apertura) {
  const medio = apertura / 2;
  return `M ${punto(radioExterior, -medio)} A ${radioExterior} ${radioExterior} 0 0 1 ${punto(radioExterior, medio)}`
    + ` L ${punto(radioInterior, medio)} A ${radioInterior} ${radioInterior} 0 0 0 ${punto(radioInterior, -medio)} Z`;
}

/**
 * Reparte los premios en `total` casillas: los comunes se alternan y cada destacado ocupa una sola, cerca de arriba para
 * que se vea antes de girar.
 */
export function repartirCasillas(premios, total) {
  const comunes = premios.filter((premio) => !premio.destacado);
  const destacados = premios.filter((premio) => premio.destacado);
  if (total < premios.length || !comunes.length) throw new RangeError(`No caben ${premios.length} premios en ${total} casillas`);
  const casillas = Array.from({ length: total }, (_, indice) => comunes[indice % comunes.length]);
  destacados.forEach((premio, indice) => { casillas[Math.floor(((indice + 0.15) * total) / destacados.length)] = premio; });
  return casillas;
}

/** Indice de la casilla que esta bajo el indicador con la ruleta girada `angulo` grados. */
export function casillaBajoIndicador(angulo, total) {
  return modulo(Math.round(-angulo / (360 / total)), total);
}

/** Angulo al que debe llegar la ruleta para que el centro de la casilla `indice` quede bajo el indicador. */
export function anguloFinal(actual, indice, total, vueltas) {
  const objetivo = -indice * (360 / total);
  return actual + vueltas * 360 + modulo(objetivo - actual, 360);
}
