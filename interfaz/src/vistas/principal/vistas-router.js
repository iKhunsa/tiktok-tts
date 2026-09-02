import { spCancelCapture } from './soundpad.js';
import { modReload, modStartAutoRefresh, modStopAutoRefresh, maybeShowModerationTour } from './moderacion.js';

export function switchView(name) {
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
  // El refresco de la tabla de moderacion solo corre con la vista visible.
  if (name === 'moderacion') {
    modReload(true);
    modStartAutoRefresh();
    maybeShowModerationTour();
  } else {
    modStopAutoRefresh();
  }
}
