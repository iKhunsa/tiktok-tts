/**
 * Rota los anuncios de un slot publicitario (precarga las imagenes,
 * cross-fade con dos capas). Las imagenes salen de data-ads del slot, en orden.
 */
export function iniciarRotacionAnuncio(slotId, intervaloMs) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const layers = slot.querySelectorAll('.ad-layer');
  let ads;
  try {
    ads = JSON.parse(slot.dataset.ads || '[]');
  } catch (e) {
    ads = [];
  }
  if (layers.length < 2 || ads.length < 2) return;
  let i = 0;
  let front = 0;
  ads.forEach((src) => { const p = new Image(); p.src = src; }); // precarga
  setInterval(() => {
    i = (i + 1) % ads.length;
    const back = 1 - front;
    layers[back].src = ads[i];
    layers[back].classList.add('is-active');
    layers[front].classList.remove('is-active');
    front = back;
  }, intervaloMs);
}
