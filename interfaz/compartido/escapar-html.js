/**
 * Reemplaza las 10 copias de escapeHtml/escHtml/esc (3 nombres distintos)
 * que existian repartidas entre index.html, advanced.html, mobile.html y
 * los overlays.
 */
export function escaparHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
