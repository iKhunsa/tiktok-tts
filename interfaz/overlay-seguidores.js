import { cargarLocaleOverlay, aplicarI18nOverlay, idiomaOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { MUESTRA_SEGUIDORES } from './compartido/muestras-vista-previa.js';

registrarErroresOverlay();

const params = leerParametros();
aplicarParametrosVisuales(params);
const goal = intParam(params, 'goal', 0);

let sessionFollows = 0;
let baseFollowerCount = 0;

// Vista previa: sin seguidores reales se muestra un contador de ejemplo.
function aplicarMuestra() {
  if (!esVistaPrevia(params) || sessionFollows || baseFollowerCount) return;
  sessionFollows = MUESTRA_SEGUIDORES.sesion;
  baseFollowerCount = MUESTRA_SEGUIDORES.base;
}

function updateGoalTarget() {
  if (goal > 0) {
    document.getElementById('divider').style.display = '';
    document.getElementById('goalSection').style.display = '';
    document.getElementById('goalTarget').textContent = (baseFollowerCount + goal).toLocaleString(idiomaOverlay());
  }
}

function render() {
  const el = document.getElementById('count');
  const total = baseFollowerCount + sessionFollows;
  el.textContent = total.toLocaleString(idiomaOverlay());
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');

  if (goal > 0) {
    const pct = Math.min((sessionFollows / goal) * 100, 100);
    document.getElementById('goalBar').style.width = pct + '%';
    document.getElementById('goalCurrent').textContent = total.toLocaleString(idiomaOverlay());
  }
}

fetch('/api/overlay-stats')
  .then((r) => r.json())
  .then((d) => {
    sessionFollows = d.followCount || 0;
    baseFollowerCount = d.baseFollowerCount || 0;
    aplicarMuestra();
    updateGoalTarget();
    render();
  })
  .catch(() => { aplicarMuestra(); updateGoalTarget(); render(); });

function alManejarMensaje(d) {
  if (d.type === 'follow') { sessionFollows++; render(); }
  if (d.type === 'connected' && d.isFirst) { sessionFollows = 0; aplicarMuestra(); render(); }
  if (d.type === 'follower-base') {
    baseFollowerCount = d.count || 0;
    updateGoalTarget();
    render();
  }
  if (d.type === 'config-updated') aplicarA11y(d.config || {});
}

const aplicarA11y = iniciarAccesibilidadOverlay();

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay(alManejarMensaje);
});
