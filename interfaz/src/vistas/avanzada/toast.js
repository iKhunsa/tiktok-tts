/**
 * Toast de advanced.html: usa el nodo estatico #toast del markup (con su
 * CSS `.toast`/`.show` propio en advanced-legacy.css), a diferencia del
 * toast en cola de la vista principal o el generico de compartido/toast.js
 * que crea su propio nodo con otra clase. Portado 1:1 para no arriesgar el
 * estilo visual de esta vista todavia sin unificar paleta (ver fase-05/06).
 */
export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
