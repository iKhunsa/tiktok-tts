/**
 * Toast de mobile.html: nodo estatico #toast (CSS propio en
 * mobile-legacy.css), mismo patron que vistas/avanzada/toast.js — cada
 * vista legacy conserva su propio toast hasta la unificacion de paleta
 * (fase-05/06).
 */
let toastTimer;
export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
