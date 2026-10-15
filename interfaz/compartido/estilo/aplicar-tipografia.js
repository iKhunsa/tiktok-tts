import { cargarFuente, familiaCss } from './fuentes.js';

/** Publica la tipografia del overlay como variables CSS (--ff, --fs, --lh, --ls). */
export function aplicarTipografia(cfg) {
  const raiz = document.documentElement.style;
  raiz.setProperty('--ff', familiaCss(cfg.fuente));
  raiz.setProperty('--fs', `${cfg.tamano}px`);
  raiz.setProperty('--lh', String(cfg.interlineado));
  raiz.setProperty('--ls', `${cfg.espaciadoLetras}px`);
  cargarFuente(cfg.fuente);
}
