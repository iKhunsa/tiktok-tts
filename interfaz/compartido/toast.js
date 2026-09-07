/**
 * Toast unico. Reemplaza las 3 implementaciones incompatibles que existian
 * en index.html (nodo creado al vuelo, 2200ms), advanced.html (#toast +
 * clase .show, 2500ms) y mobile.html (#toast + clearTimeout, 2200ms).
 * Usa el mismo mecanismo en los tres casos: crea el nodo si no existe,
 * lo reutiliza en llamadas siguientes.
 */
let _toastEl = null;
let _toastTimer = null;

export function mostrarToast(mensaje, duracionMs = 2200) {
  if (!_toastEl) {
    _toastEl = document.createElement('div');
    _toastEl.className = 'toast-compartido';
    document.body.appendChild(_toastEl);
  }
  _toastEl.textContent = mensaje;
  _toastEl.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => _toastEl.classList.remove('show'), duracionMs);
}
