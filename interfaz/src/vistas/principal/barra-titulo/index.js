import { switchView, historialVistas } from '../vistas-router.js';
import { novedadVigente } from '../novedades/vigencia.js';
import { abrirNovedades, iniciarModalNovedades } from '../novedades/modal.js';
import { openDiscordModal } from '../modales-avisos.js';
import { cargarSesion } from '../../../nucleo/estado/sesion.js';
import { showToast } from '../../../componentes/toast.js';
import { t } from '../../../nucleo/i18n/i18n.js';

function irA(vista) {
  if (vista) switchView(vista, { desdeHistorial: true });
}

function iniciarNavegacion() {
  const atras = document.getElementById('titlebarBack');
  const adelante = document.getElementById('titlebarForward');
  const sincronizar = () => {
    atras.disabled = !historialVistas.puedeRetroceder();
    adelante.disabled = !historialVistas.puedeAvanzar();
  };
  atras.addEventListener('click', () => irA(historialVistas.retroceder()));
  adelante.addEventListener('click', () => irA(historialVistas.avanzar()));
  historialVistas.suscribir(sincronizar);
  sincronizar();
}

// Sin versión (corriendo en navegador, fuera de Electron) queda compacto.
function iniciarBotonNovedades() {
  const boton = document.getElementById('titlebarNews');
  boton.addEventListener('click', abrirNovedades);
  window.electronAPI?.getAppVersion?.()
    .then((version) => boton.classList.toggle('is-expanded', novedadVigente(version)))
    .catch(() => {});
}

// Los botones min/max/cerrar son nativos y el scrim del modal no los cubre:
// el main les baja el contraste mientras haya algún modal abierto. childList:
// los popups que se crean al vuelo (Mi cuenta, planes, Pro) entran ya con .show.
function iniciarAtenuadoDeControles() {
  if (!window.electronAPI?.dimTitleBar) return;
  let atenuado = false;
  new MutationObserver(() => {
    const hayModal = !!document.querySelector('.modal-overlay.show');
    if (hayModal === atenuado) return;
    atenuado = hayModal;
    window.electronAPI.dimTitleBar(hayModal);
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
}

// Re-hidrata avatar/banner/roles/plan desde el servidor por si un cambio
// (banner subido, rol de canal cambiado, etc.) tardo en reflejarse en la UI.
function iniciarBotonRefrescar() {
  const boton = document.getElementById('titlebarRefresh');
  boton.addEventListener('click', async () => {
    if (boton.classList.contains('is-loading')) return;
    boton.classList.add('is-loading');
    boton.disabled = true;
    try {
      await cargarSesion();
      showToast(t('titlebar.refreshed'));
    } finally {
      boton.classList.remove('is-loading');
      boton.disabled = false;
    }
  });
}

export function iniciarBarraTitulo() {
  iniciarAtenuadoDeControles();
  iniciarNavegacion();
  iniciarModalNovedades();
  iniciarBotonNovedades();
  iniciarBotonRefrescar();
  document.getElementById('titlebarDiscord').addEventListener('click', () => openDiscordModal('titlebar'));
}
