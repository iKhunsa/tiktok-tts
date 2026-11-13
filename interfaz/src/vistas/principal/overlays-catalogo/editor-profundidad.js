import { saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { sincronizarCamposOverlay } from '../campos-overlay/sincronizar.js';
import { fijarValorOverlay, valorOverlay } from './posicion-escena.js';

/** Profundidad (eje Z) guardada de un overlay: mayor queda por encima. */
export const zDe = (id) => valorOverlay(id, 'capaZ') ?? 0;

/** Ids de abajo hacia arriba: por capaZ y, a igualdad, por orden de llegada. */
export const ordenZ = (ids) => ids
  .map((id, llegada) => [id, llegada])
  .sort(([a, i], [b, j]) => zDe(a) - zDe(b) || i - j)
  .map(([id]) => id);

// Renumera 0..n-1 en el orden pedido y guarda solo lo que cambia.
function guardarOrden(orden) {
  orden.forEach((id, z) => {
    if (zDe(id) === z) return;
    fijarValorOverlay(id, 'capaZ', z);
    sincronizarCamposOverlay(id);
    updateOverlayUrl(id);
  });
  saveSettings();
}

/** accion: 'frente' | 'fondo' | 'arriba' (un nivel) | 'abajo' (un nivel). */
export function moverZ(ids, id, accion) {
  const orden = ordenZ(ids);
  const actual = orden.indexOf(id);
  orden.splice(actual, 1);
  const destino = { frente: orden.length, fondo: 0, arriba: Math.min(actual + 1, orden.length), abajo: Math.max(actual - 1, 0) }[accion];
  orden.splice(destino, 0, id);
  guardarOrden(orden);
}

/** Deja `id` en la posicion `indice` (0 = fondo) del orden de abajo hacia arriba. */
export function ponerZ(ids, id, indice) {
  const orden = ordenZ(ids);
  orden.splice(orden.indexOf(id), 1);
  orden.splice(indice, 0, id);
  guardarOrden(orden);
}
