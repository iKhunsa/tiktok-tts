/** escapeHtml local: 4to nombre distinto de la misma funcion en el codigo
 * viejo (esc/escHtml/escapeHtml/escaparHtml). Se mantiene local en vez de
 * usar compartido/escapar-html.js porque esta pagina tenia 2 variantes
 * (esc sin comillas simples, escHtml con todas) usadas en sitios distintos
 * — portadas 1:1 para no arriesgar el escapado de HTML generado dinamico. */
export function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
