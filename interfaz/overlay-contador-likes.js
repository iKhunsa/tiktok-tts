import { cargarLocaleOverlay, aplicarI18nOverlay, idiomaOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { MUESTRA_LIKES } from './compartido/muestras-vista-previa.js';

registrarErroresOverlay();

const params = leerParametros();
aplicarParametrosVisuales(params);

let total = 0;

const sumarLikes = (filas) => filas.reduce((suma, fila) => suma + (fila.totalLikes || 0), 0);

function pintar() {
  const el = document.getElementById('count');
  el.textContent = total.toLocaleString(idiomaOverlay());
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// ponytail: al recargar en pleno directo arranca de la suma del ranking (top
// limitado), asi que puede quedar corto; pasar a un total real si el backend lo expone.
fetch('/api/overlay-stats')
  .then((r) => r.json())
  .then((d) => { total = sumarLikes(d.topLikers || []); })
  .catch(() => {})
  .finally(() => {
    if (!total && esVistaPrevia(params)) total = sumarLikes(MUESTRA_LIKES);
    pintar();
  });

const aplicarA11y = iniciarAccesibilidadOverlay();

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay((d) => {
    if (d.type === 'like') { total += d.likeCount || 0; pintar(); }
    if (d.type === 'connected' && d.isFirst) { total = 0; pintar(); }
    if (d.type === 'config-updated') aplicarA11y(d.config || {});
  });
});
