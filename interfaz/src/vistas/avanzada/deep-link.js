/** Entrada directa desde el boton de la vista de Chat (index.html):
 * `/advanced.html#palabras-bloqueadas` hace scroll y resalta el panel. */
export function focusHashPanel() {
  const id = (location.hash || '').replace('#', '');
  if (!id) return;
  const el = document.getElementById(id);
  if (!el || !el.classList.contains('panel')) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.classList.add('panel-highlight');
  setTimeout(() => el.classList.remove('panel-highlight'), 2500);
}

/** Modo popup: abierto en ventana aparte desde index.html (?popup=1) para
 * no descargar el renderer del chat y cortar el TTS. Los enlaces "volver
 * al chat" cierran la ventana en vez de navegar (evita un 2do chat / 2do
 * narrador). */
export function iniciarModoPopup() {
  if (!new URLSearchParams(location.search).has('popup')) return;
  document.querySelectorAll('header a[href="/"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.close();
    });
  });
}
