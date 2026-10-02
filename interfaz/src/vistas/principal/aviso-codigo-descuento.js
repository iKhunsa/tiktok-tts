/**
 * Primer banner del chat (Halloween): en vez de ir al Discord, abre un modal con
 * el codigo de descuento para copiarlo y un boton a los planes, donde se pega al
 * pagar. Los demas banners siguen yendo al Discord.
 */
import { abrirPopupPlanes } from '../../componentes/popup-planes.js';
import { copyToClipboard } from './utils-app.js';

const CODIGO = 'WASSUPTTS';
const BANNER_CODIGO = 'banner-sale-octubre';
const MS_ICONO_COPIADO = 1500;

const ICONO_COPIAR = 'icons/content_copy.svg';
const ICONO_COPIADO = 'icons/check_circle.svg';

export function iniciarAvisoCodigoDescuento() {
  const overlay = document.getElementById('promoCodeModal');
  const enlace = document.querySelector('#chatAdSlot .ad-link');
  if (!overlay || !enlace) return;

  const boton = overlay.querySelector('.promo-code');
  const icono = overlay.querySelector('.promo-code-icon');
  let temporizador;

  const cerrar = () => overlay.classList.remove('show');

  overlay.querySelector('.promo-code-text').textContent = CODIGO;

  // El banner activo es la capa visible del carrusel; solo el del codigo abre el modal.
  enlace.addEventListener('click', (e) => {
    const activa = enlace.querySelector('.ad-layer.is-active');
    if (!activa || !activa.src.includes(BANNER_CODIGO)) return;
    e.preventDefault();
    overlay.classList.add('show');
  });

  boton.addEventListener('click', () => {
    copyToClipboard(CODIGO);
    icono.src = ICONO_COPIADO;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { icono.src = ICONO_COPIAR; }, MS_ICONO_COPIADO);
  });

  overlay.querySelector('.promo-code-plans').addEventListener('click', () => {
    cerrar();
    abrirPopupPlanes();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.modal-close').addEventListener('click', cerrar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
}
