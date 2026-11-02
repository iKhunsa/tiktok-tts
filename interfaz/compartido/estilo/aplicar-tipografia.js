import { cargarFuente, familiaCss } from './fuentes.js';

/**
 * Publica la tipografia del overlay como variables CSS (las consume estilo-texto.css).
 * El tamano es el de la medida base y escala con la unidad --u (ver estilo-texto.css).
 */
export function aplicarTipografia(cfg, anchoBase) {
  const raiz = document.documentElement.style;
  raiz.setProperty('--ff', familiaCss(cfg.fuente));
  raiz.setProperty('--ancho-base', String(anchoBase));
  raiz.setProperty('--escala', String(cfg.escala));
  raiz.setProperty('--fs', `calc(${cfg.tamano} * var(--u))`);
  raiz.setProperty('--lh', String(cfg.interlineado));
  raiz.setProperty('--ls', `${cfg.espaciadoLetras}px`);
  raiz.setProperty('--ws', `calc(${cfg.espaciadoPalabras} * var(--u))`);
  raiz.setProperty('--tt', cfg.mayusculas);
  raiz.setProperty('--fst', cfg.cursiva ? 'italic' : 'normal');
  raiz.setProperty('--td', cfg.subrayado ? 'underline' : 'none');
  raiz.setProperty('--contorno-w', `calc(${cfg.contornoGrosor} * var(--u))`);
  raiz.setProperty('--contorno-c', cfg.contornoColor);
  // Sin definir, cada texto conserva su peso y su sombra propios (fallback de var() en el CSS).
  if (cfg.peso !== 'auto') raiz.setProperty('--fw', cfg.peso);
  if (cfg.sombra) raiz.setProperty('--sombra', `0 calc(2 * var(--u)) calc(${cfg.sombraDifuminado} * var(--u)) ${cfg.sombraColor}`);
  cargarFuente(cfg.fuente);
}
