import { switchView, historialVistas } from '../vistas-router.js';
import { novedadVigente } from '../novedades/vigencia.js';
import { abrirNovedades, iniciarModalNovedades } from '../novedades/modal.js';
import { leerEstadoUi } from '../../../nucleo/estado/estado-ui.js';
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
  // Esc = flecha atras, salvo que Esc ya tenga otro trabajo (popup abierto, escribiendo, handler propio).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || atras.disabled) return;
    if (document.querySelector('.modal-overlay.show')) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    atras.click();
  });
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

// Recarga nativa de la página (re-ejecuta todo el bootstrap del renderer). El arranque cae en el chat, así que
// se vuelve a donde se estaba con el estado que la interfaz guarda en cada cambio (nucleo/estado/estado-ui.js).
function restaurarTrasRecarga() {
  const { vista, editor } = leerEstadoUi();
  if (vista) switchView(vista);
  if (editor) document.getElementById('ovlEditorUnificado')?.click(); // el editor restaura su sección, escena y capa
}

function iniciarBotonRefrescar() {
  const boton = document.getElementById('titlebarRefresh');
  boton.addEventListener('click', () => {
    if (boton.classList.contains('is-loading')) return;
    boton.classList.add('is-loading');
    boton.disabled = true;
    window.location.reload();
  });
  restaurarTrasRecarga();
}

export function iniciarBarraTitulo() {
  iniciarAtenuadoDeControles();
  iniciarNavegacion();
  iniciarModalNovedades();
  iniciarBotonNovedades();
  iniciarBotonRefrescar();
  document.getElementById('titlebarDiscord').addEventListener('click', () => openDiscordModal('titlebar'));
}
