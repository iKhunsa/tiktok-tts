/** Color '#rrggbb' (o 'rrggbb') como [r, g, b], o null si no es un color valido. */
export function hexARgb(hex) {
  const coincide = /^#?([0-9a-f]{6})$/i.exec(typeof hex === 'string' ? hex : '');
  if (!coincide) return null;
  const numero = parseInt(coincide[1], 16);
  return [numero >> 16, (numero >> 8) & 255, numero & 255];
}

const DISTANCIA_MAX = Math.hypot(255, 255, 255); // entre negro y blanco

/**
 * Quita de una imagen (pixeles RGBA, como los de un ImageData) el color `clave` [r, g, b]: lo cercano pasa a
 * transparente y el borde se difumina. `tolerancia` va de 0 (no quita nada) a 100 (quita cualquier color).
 * Modifica `pixeles` en su sitio; respeta la transparencia que ya tuvieran.
 */
export function aplicarCroma(pixeles, [rojo, verde, azul], tolerancia) {
  const limite = (Math.min(100, Math.max(0, tolerancia)) / 100) * DISTANCIA_MAX;
  const piso = limite * 0.7; // hasta aqui, del todo transparente; de aqui al limite, un degradado suave
  for (let i = 0; i < pixeles.length; i += 4) {
    const distancia = Math.hypot(pixeles[i] - rojo, pixeles[i + 1] - verde, pixeles[i + 2] - azul);
    if (distancia >= limite) continue;
    pixeles[i + 3] = distancia <= piso ? 0 : Math.round((pixeles[i + 3] * (distancia - piso)) / (limite - piso));
  }
}
