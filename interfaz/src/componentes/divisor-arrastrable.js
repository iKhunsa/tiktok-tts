// Divisor vertical arrastrable, generico — no sabe nada de PortalView ni de
// ningun otro consumidor. onDrag se llama en cada frame del arrastre (valor
// crudo, clampeado solo a los limites pasados por el caller); onDragEnd se
// llama una vez al soltar, con el valor final.
export function crearDivisor({ onDrag, onDragEnd, minPx, maxPx, initialPx }) {
  const el = document.createElement('div');
  el.className = 'divisor-arrastrable';
  el.setAttribute('role', 'separator');
  el.setAttribute('aria-orientation', 'vertical');

  let dragging = false;
  let startX = 0;
  let startPx = initialPx;

  function clamp(px) {
    return Math.min(Math.max(px, minPx), maxPx);
  }

  function onPointerDown(e) {
    dragging = true;
    startX = e.clientX;
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
    document.body.classList.add('divisor-resizing');
  }

  function onPointerMove(e) {
    if (!dragging) return;
    // Arrastrar hacia la izquierda agranda el panel (ancla al borde derecho).
    onDrag(clamp(startPx + (startX - e.clientX)));
  }

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    el.releasePointerCapture(e.pointerId);
    el.classList.remove('is-dragging');
    document.body.classList.remove('divisor-resizing');
    startPx = clamp(startPx + (startX - e.clientX));
    onDragEnd(startPx);
  }

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  return {
    el,
    setWidth(px) { startPx = clamp(px); },
  };
}
