/**
 * Nieve decorativa: copos que caen con transform y opacity (solo compositor, sin layout). Cada copo lleva su propia
 * posicion, tamano, duracion y desfase como variables CSS (ver temporada.css); con movimiento reducido el CSS los oculta.
 */
const COPOS = 36;

export function crearNieve(contenedor, cantidad = COPOS) {
  const capa = document.createElement('div');
  capa.className = 'temporada-nieve';
  capa.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < cantidad; i++) {
    const copo = document.createElement('span');
    const tamano = 2 + Math.random() * 5;
    copo.style.cssText = `--x:${(Math.random() * 100).toFixed(1)}%;--t:${tamano.toFixed(1)}px;`
      + `--d:${(9 + Math.random() * 10).toFixed(1)}s;--r:${(-Math.random() * 18).toFixed(1)}s;`
      + `--v:${((Math.random() - 0.5) * 60).toFixed(0)}px;--o:${(0.35 + Math.random() * 0.55).toFixed(2)}`;
    capa.append(copo);
  }
  contenedor.prepend(capa);
  return capa;
}
