/** escapeHtml de mobile.html. Una sola variante: escapa todo (incluida la
 * comilla simple), segura tanto para texto como para atributos y para
 * strings dentro de onclick="fn('...')". `esc` queda como alias por los
 * imports existentes. */
export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const esc = escHtml;
