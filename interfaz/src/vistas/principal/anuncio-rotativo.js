import { ruedaCarrusel } from '../../componentes/rueda-carrusel.js';

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

  const puntos = document.createElement('div');
  puntos.className = 'ovl-puntos';
  const puntosEl = ads.map((_, n) => {
    const punto = document.createElement('button');
    punto.type = 'button';
    punto.className = 'ovl-punto';
    punto.addEventListener('click', () => irA(n));
    puntos.append(punto);
    return punto;
  });
  slot.append(puntos);

  function irA(n) {
    if (n === i) return;
    i = n;
    const back = 1 - front;
    layers[back].src = ads[i];
    layers[back].classList.add('is-active');
    layers[front].classList.remove('is-active');
    front = back;
    puntosEl.forEach((p, k) => p.classList.toggle('activo', k === i));
  }

  puntosEl[0].classList.add('activo');
  let timer = setInterval(() => irA((i + 1) % ads.length), intervaloMs);
  const reiniciar = () => { clearInterval(timer); timer = setInterval(() => irA((i + 1) % ads.length), intervaloMs); };
  puntos.addEventListener('click', reiniciar);
  ruedaCarrusel(slot, (dir) => { irA((i + dir + ads.length) % ads.length); reiniciar(); });
}
