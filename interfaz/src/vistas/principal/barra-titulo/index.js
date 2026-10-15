import { switchView, historialVistas } from '../vistas-router.js';
import { novedadVigente } from '../novedades/vigencia.js';
import { abrirNovedades, iniciarModalNovedades } from '../novedades/modal.js';
import { openDiscordModal } from '../modales-avisos.js';

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
// el main les baja el contraste mientras haya algún modal abierto.
function iniciarAtenuadoDeControles() {
  if (!window.electronAPI?.dimTitleBar) return;
  let atenuado = false;
  new MutationObserver(() => {
    const hayModal = !!document.querySelector('.modal-overlay.show');
    if (hayModal === atenuado) return;
    atenuado = hayModal;
    window.electronAPI.dimTitleBar(hayModal);
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
}

export function iniciarBarraTitulo() {
  iniciarAtenuadoDeControles();
  iniciarNavegacion();
  iniciarModalNovedades();
  iniciarBotonNovedades();
  document.getElementById('titlebarDiscord').addEventListener('click', () => openDiscordModal('titlebar'));
}
