/**
 * Sistema de toasts de la app principal (distinto del toast simple de
 * interfaz/compartido/toast.js, que usan los overlays): cola de hasta 3
 * visibles, apilados hacia arriba, con variantes error/success y respeto
 * de prefers-reduced-motion. Portado 1:1 desde index.html.
 */
let _toastStack = null;

function _ensureToastStack() {
  if (_toastStack) return _toastStack;
  const style = document.createElement('style');
  style.textContent = `
    #toastStack { position:fixed; left:50%; bottom:24px; transform:translateX(-50%);
      display:flex; flex-direction:column-reverse; gap:8px; z-index:3000;
      pointer-events:none; align-items:center; }
    #toastStack .toast-item {
      background:var(--toast-bg); color:#fff; padding:13px 22px; border-radius:var(--btn-radius);
      font-size:14px; font-weight:500; letter-spacing:.3px; box-shadow:var(--shadow-1);
      max-width:min(440px, 90vw); text-align:center;
      opacity:0; transform:translateY(12px);
      transition:opacity var(--dur-4) var(--ease-out), transform var(--dur-4) var(--ease-out); }
    #toastStack .toast-item.in { opacity:1; transform:translateY(0); }
    #toastStack .toast-item.error   { background:var(--danger); }
    #toastStack .toast-item.success { background:var(--ok); color:#0a0a0a; }
    @media (prefers-reduced-motion: reduce) {
      #toastStack .toast-item { transition:opacity var(--dur-2) linear; transform:none; }
      #toastStack .toast-item.in { transform:none; }
    }
    body.reduce-motion #toastStack .toast-item { transition:opacity var(--dur-2) linear; transform:none; }
    body.reduce-motion #toastStack .toast-item.in { transform:none; }
  `;
  document.head.appendChild(style);
  _toastStack = document.createElement('div');
  _toastStack.id = 'toastStack';
  document.body.appendChild(_toastStack);
  return _toastStack;
}

function _dismissToast(el) {
  if (!el || el._closing) return;
  el._closing = true;
  clearTimeout(el._timer);
  el.classList.remove('in');
  setTimeout(() => el.remove(), 360);
}

// Saca el nodo del DOM al instante (sin animar). Se usa para el desborde de
// la pila: _dismissToast() difiere el remove() 360ms, asi que apoyarse en el
// para recortar dispararia un while infinito (children.length no baja en el
// mismo tick) — eso congelaba toda la UI al spamear "saltar mensaje".
function _removeToastNow(el) {
  if (!el) return;
  el._closing = true;
  clearTimeout(el._timer);
  el.remove();
}

/** @param {string} message @param {'error'|'success'|undefined} [type] */
export function showToast(message, type) {
  const stack = _ensureToastStack();

  // Coalesce: si el ultimo toast vivo dice lo mismo (spam del boton "saltar
  // mensaje", errores repetidos), solo reiniciar su TTL en vez de apilar.
  const last = stack.lastElementChild;
  if (last && !last._closing && last.textContent === message) {
    clearTimeout(last._timer);
    last._timer = setTimeout(() => _dismissToast(last), type === 'error' ? 4000 : 2600);
    return;
  }

  const el = document.createElement('div');
  el.className = 'toast-item' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  el.textContent = message;
  stack.appendChild(el);
  while (stack.children.length > 3) _removeToastNow(stack.firstElementChild);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  const ttl = type === 'error' ? 4000 : 2600;
  el._timer = setTimeout(() => _dismissToast(el), ttl);
}
