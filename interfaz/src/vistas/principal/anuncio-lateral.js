/**
 * Rota los banners publicitarios del sidebar cada 30s (precarga las
 * imagenes, cross-fade con dos capas). Portado 1:1 desde el IIFE inline
 * de index.html.
 */
export function iniciarRotacionAnuncioLateral() {
  const slot = document.getElementById('sidebarAdSlot');
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
  }, 30000);
}
