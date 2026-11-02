import { t, aplicarTraducciones } from '../../nucleo/i18n/i18n.js';
import { appSettings } from '../../nucleo/estado/ajustes-app.js';
import { SKINS_CHAT } from '../../../compartido/estilo/campos-chat.js';
import { sincronizarCamposOverlay } from './campos-overlay/sincronizar.js';
import { comprarPro, tieneAcceso } from './overlays-catalogo/tienda.js';

// Las opciones usan data-cfg-fija: campos-overlay guarda el cambio, recarga la vista previa y marca la activa.
const crearOpcion = (overlay, skin) => `
  <button class="ovl-skin-opcion" type="button" data-cfg-overlay="${overlay}" data-cfg-fija='${JSON.stringify({ skin })}'>
    <span class="ovl-skin-miniatura" data-skin="${skin}" aria-hidden="true"><i></i><i></i></span>
    <span data-i18n="overlayCfg.skins.${skin}"></span>
  </button>`;

const crearAviso = (claveTexto, claveBoton, accion) => `
  <div class="ovl-skin-aviso">
    <span data-i18n="${claveTexto}"></span>
    <button class="ovl-skin-cta" type="button" data-accion="${accion}" data-i18n="${claveBoton}"></button>
  </div>`;

function contenidoFavoritas(overlay) {
  if (!tieneAcceso()) return crearAviso('overlayCfg.favoritasPro', 'overlayCfg.favoritasComprar', 'comprar');
  const favoritas = appSettings.skinsFavoritas;
  if (!favoritas.length) return crearAviso('overlayCfg.favoritasVacio', 'overlayCfg.favoritasExplorar', 'explorar');
  return favoritas.map((skin) => crearOpcion(overlay, skin)).join('');
}

/** Boton flotante de la vista previa que despliega las skins disponibles y, a la derecha, las favoritas. */
export function crearSelectorSkin(overlay) {
  const selector = document.createElement('div');
  selector.className = 'ovl-skin';
  selector.innerHTML = `
    <div class="ovl-skin-barra" role="group" data-i18n-aria-label="overlayCfg.cambiarSkin">
      <div class="ovl-skin-pagina">${SKINS_CHAT.map((skin) => crearOpcion(overlay, skin)).join('')}</div>
      <div class="ovl-skin-pagina ovl-skin-favoritas" hidden></div>
      <button class="ovl-skin-flecha" type="button" aria-pressed="false" data-i18n-aria-label="overlayCfg.verFavoritas" data-i18n-title="overlayCfg.verFavoritas"><img src="icons/chevron_right.svg" alt=""></button>
    </div>
    <button class="ovl-skin-boton" type="button" aria-expanded="false">
      <img src="icons/palette-white.svg" alt=""><span data-i18n="overlayCfg.cambiarSkin"></span>
    </button>`;
  const boton = selector.querySelector('.ovl-skin-boton');
  const flecha = selector.querySelector('.ovl-skin-flecha');
  const [pagina, favoritas] = selector.querySelectorAll('.ovl-skin-pagina');

  const mostrarFavoritas = (visibles) => {
    pagina.hidden = visibles;
    favoritas.hidden = !visibles;
    flecha.setAttribute('aria-pressed', String(visibles));
    if (!visibles) return;
    favoritas.innerHTML = contenidoFavoritas(overlay);
    aplicarTraducciones(favoritas);
    sincronizarCamposOverlay(overlay);
  };

  const cerrar = () => {
    boton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', alPulsarFuera);
    document.removeEventListener('keydown', alPulsarTecla);
  };
  const alPulsarFuera = (evento) => { if (!selector.contains(evento.target)) cerrar(); };
  const alPulsarTecla = (evento) => {
    if (evento.key !== 'Escape') return;
    cerrar();
    boton.focus();
  };

  flecha.addEventListener('click', () => mostrarFavoritas(flecha.getAttribute('aria-pressed') !== 'true'));
  favoritas.addEventListener('click', (evento) => {
    const cta = evento.target.closest('[data-accion]');
    if (!cta) return;
    cerrar();
    if (document.fullscreenElement) document.exitFullscreen();
    if (cta.dataset.accion === 'comprar') comprarPro(cta);
    else document.querySelector('[data-ovl-modo="tienda"]').click();
  });
  boton.addEventListener('click', () => {
    if (boton.getAttribute('aria-expanded') === 'true') return cerrar();
    boton.setAttribute('aria-expanded', 'true');
    mostrarFavoritas(flecha.getAttribute('aria-pressed') === 'true'); // el plan o las favoritas pueden haber cambiado
    sincronizarCamposOverlay(overlay);
    document.addEventListener('pointerdown', alPulsarFuera);
    document.addEventListener('keydown', alPulsarTecla);
  });

  aplicarTraducciones(selector);
  return selector;
}
