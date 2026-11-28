import { sinMovimiento } from '../../componentes/ruleta/sin-movimiento.js';

const VUELO_MS = 900;
const ENTRE_MONEDAS_MS = 45;
const MAX_MONEDAS = 18;

const centro = (elemento) => {
  const caja = elemento.getBoundingClientRect();
  return { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };
};
const sumarEnPantalla = (cifra, cuanto) => { cifra.textContent = Number(cifra.textContent) + cuanto; };

/** El "+100" o "-50" que aparece bajo el saldo. */
function mostrarAbono(saldo, cantidad) {
  if (!saldo.isConnected) return; // el banco se cerro con las monedas en el aire
  const aviso = document.createElement('strong');
  aviso.className = 'temporada-ganancia';
  aviso.classList.toggle('is-gasto', cantidad < 0);
  aviso.textContent = cantidad < 0 ? `\u2212${-cantidad}` : `+${cantidad}`;
  aviso.style.left = `${centro(saldo).x}px`;
  aviso.style.top = `${saldo.getBoundingClientRect().bottom + 6}px`;
  document.body.append(aviso);
  aviso.animate([
    { opacity: 0, translate: '-50% -8px' },
    { opacity: 1, translate: '-50% 0', offset: 0.15 },
    { opacity: 1, translate: '-50% 0', offset: 0.75 },
    { opacity: 0, translate: '-50% 10px' },
  ], { duration: 1800, easing: 'ease-out', fill: 'forwards' }).onfinish = () => aviso.remove();
}

/** Un gasto: la cifra baja al momento y aparece el "-N". */
export function animarGasto(saldo, cantidad) {
  sumarEnPantalla(saldo.querySelector('[data-cifra]'), -cantidad);
  mostrarAbono(saldo, -cantidad);
}

/** Una moneda: salta desde el origen, se abre en abanico y despues viaja al saldo. */
function lanzarMoneda(desde, hasta, retraso) {
  const moneda = document.createElement('span');
  moneda.className = 'temporada-moneda temporada-moneda-vuela';
  moneda.style.left = `${desde.x}px`;
  moneda.style.top = `${desde.y}px`;
  document.body.append(moneda);
  const angulo = Math.random() * Math.PI * 2;
  const alcance = (0.5 + Math.random() * 0.5) * Math.min(window.innerWidth, window.innerHeight) * 0.16;
  const salto = `translate(${Math.cos(angulo) * alcance}px, ${Math.sin(angulo) * alcance}px)`;
  const vuelo = moneda.animate([
    { transform: 'translate(0, 0) scale(0.4)', opacity: 0, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    { transform: `${salto} scale(1.15)`, opacity: 1, offset: 0.38, easing: 'cubic-bezier(0.6, 0, 0.3, 1)' },
    { transform: `translate(${hasta.x - desde.x}px, ${hasta.y - desde.y}px) scale(0.85)`, opacity: 1 },
  ], { duration: VUELO_MS, delay: retraso, fill: 'both' });
  return vuelo.finished.then(() => moneda.remove());
}

/**
 * Muestra como `cantidad` entra en el saldo: las monedas vuelan desde `origen` y la cifra sube con cada una que llega.
 * Con movimiento reducido, o si el origen no se ve, solo cambia la cifra y aparece el "+N".
 * La cifra se suma sobre lo que ya muestra, asi dos recompensas seguidas no se pisan.
 */
export function animarGanancia(saldo, cantidad, origen) {
  const cifra = saldo.querySelector('[data-cifra]');
  if (sinMovimiento() || !origen.offsetParent) {
    sumarEnPantalla(cifra, cantidad);
    mostrarAbono(saldo, cantidad);
    return;
  }
  const icono = saldo.querySelector('.temporada-moneda');
  const total = Math.min(MAX_MONEDAS, 6 + Math.round(cantidad / 20));
  for (let i = 0; i < total; i++) {
    const parte = Math.floor(cantidad / total) + (i < cantidad % total ? 1 : 0);
    lanzarMoneda(centro(origen), centro(icono), i * ENTRE_MONEDAS_MS).then(() => {
      sumarEnPantalla(cifra, parte);
      icono.animate([{ scale: 1 }, { scale: 1.3 }, { scale: 1 }], { duration: 220, easing: 'ease-out' });
      if (i === 0) mostrarAbono(saldo, cantidad);
    });
  }
}
