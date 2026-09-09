import { spCancelCapture } from './soundpad.js';
import { modReload, modStartAutoRefresh, modStopAutoRefresh, maybeShowModerationTour } from './moderacion.js';
import { renderMcpPanel } from './mcp/index.js';
import { renderCuentaPanel } from './cuenta/index.js';
import { appBloqueada } from '../../nucleo/estado/sesion.js';
import { aplicarBloqueoVista } from '../../nucleo/estado/vista-bloqueada.js';

export function switchView(name) {
  // App bloqueada (sistema de cuentas activo + sin sesión): la única vista
  // accesible es "cuenta". Cualquier otro destino rebota ahí.
  if (appBloqueada() && name !== 'cuenta') name = 'cuenta';
  // Si se estaba capturando un atajo del soundpad, cancelarlo: si no, el
  // listener global de keydown queda pegado y se come todas las teclas.
  spCancelCapture();
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach((b) => b.classList.remove('active'));
  const view = document.getElementById('view-' + name);
  if (view) view.classList.add('active');
  const btn = document.querySelector(`.sidebar-item[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
  // La tienda de plugins se re-renderiza al entrar, por si el usuario toco
  // localStorage desde otra pestaña/ventana o volvio despues de un rato.
  if (name === 'tools' && window.renderPluginStore) window.renderPluginStore();
  if (name === 'mcp') renderMcpPanel();
  if (name === 'cuenta') renderCuentaPanel();
  // Sonidos/Bot ya se pintaron una vez al arrancar (spLoad/musicInit) -- acá
  // solo se re-evalua el bloqueo Pro (blur+popup) al entrar de verdad a la
  // vista, sin repetir sus fetches.
  if (name === 'soundpad') aplicarBloqueoVista('view-soundpad', 'soundpad');
  if (name === 'bot') aplicarBloqueoVista('view-bot', 'bot-musical');
  // El refresco de la tabla de moderacion solo corre con la vista visible.
  if (name === 'moderacion') {
    modReload(true);
    modStartAutoRefresh();
    maybeShowModerationTour();
  } else {
    modStopAutoRefresh();
  }
}
