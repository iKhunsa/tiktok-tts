/** Particulas ambientales que suben desde el centro (solo transform y opacity; ver ruleta.css). */
export function crearChispas(cantidad = 22) {
  const capa = document.createElement('div');
  capa.className = 'ruleta-chispas';
  capa.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < cantidad; i++) {
    const chispa = document.createElement('span');
    chispa.style.cssText = `--x:${(18 + Math.random() * 64).toFixed(1)}%;--y:${(35 + Math.random() * 55).toFixed(1)}%;`
      + `--t:${(3 + Math.random() * 6).toFixed(1)};--d:${(4 + Math.random() * 5).toFixed(1)}s;--r:${(-Math.random() * 9).toFixed(1)}s`;
    capa.append(chispa);
  }
  return capa;
}
