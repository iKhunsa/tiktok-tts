import { PREMIOS } from './premios.js';

/**
 * Sorteo ponderado de ejemplo: resuelve con el id ganador. Es el unico punto a cambiar cuando el backend decida el
 * premio (misma firma: una promesa con el id).
 */
export async function sortearPremio(premios = PREMIOS, azar = Math.random) {
  const total = premios.reduce((suma, premio) => suma + premio.peso, 0);
  let tirada = azar() * total;
  return (premios.find((premio) => (tirada -= premio.peso) < 0) ?? premios.at(-1)).id;
}
