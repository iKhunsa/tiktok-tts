/**
 * Modal "Mi cuenta": menu lateral fijo + seccion activa a la derecha. Se abre
 * desde el popover de cuenta (via window.abrirModalCuenta) y se cierra solo
 * si la sesion termina (logout / borrado). Las secciones sin pintor todavia
 * quedan vacias: se arman una por una.
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { trackUi } from '../../../../nucleo/telemetria-ui.js';
import { almacenSesion } from '../../../../nucleo/estado/sesion.js';
import { pintarPerfil } from './seccion-perfil.js';
import { pintarVincular } from './seccion-vincular.js';
import { pintarFacturacion } from './seccion-facturacion.js';
import { pintarAccesibilidad } from './seccion-accesibilidad.js';
import { iniciarBuscadorNav } from './buscador-nav.js';

const SECCIONES = [
  { id: 'perfil', icono: 'account_circle', key: 'cuentaModal.navPerfil', pintar: pintarPerfil },
  { id: 'vincular', icono: 'link', key: 'cuentaModal.navVincular', pintar: pintarVincular },
  { id: 'facturacion', icono: 'desktop_windows', key: 'cuentaModal.navFacturacion', pintar: pintarFacturacion },
  { id: 'accesibilidad', icono: 'accessibility_new', key: 'cuentaModal.navAccesibilidad', pintar: pintarAccesibilidad },
];

// Ayuda no es una seccion: abre el Discord de la comunidad.
const DISCORD_URL = 'https://discord.com/invite/mwY859tcQK';

let abierto;

export function abrirModalCuenta(seccionInicial = 'perfil') {
  if (abierto) return abierto.ir(seccionInicial);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show mc-overlay';
  overlay.innerHTML = `
    <div class="mc-ventana" role="dialog" aria-modal="true" aria-labelledby="mcNavTitulo">
      <button class="mc-cerrar" type="button" data-i18n-title="cuentaModal.close"><img src="icons/close.svg" alt=""></button>
      <nav class="mc-nav">
        <label class="mc-buscar mc-nav-buscar">
          <img src="icons/search.svg" alt="">
          <input type="search" data-i18n-placeholder="cuentaModal.search">
        </label>
        <div class="mc-nav-titulo" id="mcNavTitulo" data-i18n="accountMenu.myAccount"></div>
        ${SECCIONES.map((s) => `
          <button class="mc-nav-item" type="button" data-seccion="${s.id}">
            <img src="icons/${s.icono}.svg" alt=""><span data-i18n="${s.key}"></span>
          </button>`).join('')}
        <a class="mc-nav-item mc-nav-ayuda" href="${DISCORD_URL}" target="_blank" rel="noopener">
          <img src="icons/help_outline.svg" alt=""><span data-i18n="cuentaModal.navAyuda"></span>
          <img class="mc-nav-externo" src="icons/open_in_new.svg" alt="">
        </a>
      </nav>
      <section class="mc-contenido"></section>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);
  overlay.querySelector('.mc-cerrar').setAttribute('aria-label', t('cuentaModal.close'));

  const contenido = overlay.querySelector('.mc-contenido');
  let actual;
  const pintar = () => {
    const s = SECCIONES.find((x) => x.id === actual);
    contenido.replaceChildren();
    const titulo = document.createElement('h2');
    titulo.className = 'mc-titulo';
    titulo.textContent = t(s.key);
    contenido.appendChild(titulo);
    s.pintar?.(contenido, almacenSesion.getState());
  };
  const ir = (id) => {
    actual = SECCIONES.some((s) => s.id === id) ? id : 'perfil';
    for (const b of overlay.querySelectorAll('.mc-nav-item')) {
      const activo = b.dataset.seccion === actual;
      b.classList.toggle('is-active', activo);
      if (activo) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
    contenido.scrollTop = 0;
    pintar();
  };

  const desuscribir = almacenSesion.subscribe((s) => (s.signedIn ? pintar() : cerrar()));
  // Esc lo maneja componentes/cerrar-con-escape.js (click en .mc-cerrar).
  function cerrar() {
    desuscribir();
    overlay.remove();
    abierto = undefined;
  }

  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.mc-cerrar').addEventListener('click', cerrar);
  overlay.querySelector('.mc-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.mc-nav-item');
    if (item?.classList.contains('mc-nav-ayuda')) trackUi('ui:discord-joined', 'account_menu');
    else if (item?.dataset.seccion) ir(item.dataset.seccion); // los resultados del buscador se manejan solos
  });

  iniciarBuscadorNav(overlay, SECCIONES, { ir, estado: () => almacenSesion.getState() });

  abierto = { ir };
  ir(seccionInicial);
  overlay.querySelector('.mc-nav-item.is-active').focus();
}
