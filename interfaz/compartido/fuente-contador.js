import { conectarWSOverlay } from './ws-cliente.js';
import { MUESTRA_LIKES, MUESTRA_VIEWERS } from './muestras-vista-previa.js';

const sumarLikes = (filas) => filas.reduce((acumulado, fila) => acumulado + (fila.totalLikes || 0), 0);
const PAUSA_LIKES_DEMO_MS = 1800;

async function pedirEstadisticas() {
  try {
    return await (await fetch('/api/overlay-stats')).json();
  } catch {
    return {};
  }
}

/**
 * Cada contador: de donde sale su cifra. Todos avisan con alCambio({ valor, base, suma }):
 * `valor` lo que se muestra, `suma` lo que acaba de
 * entrar (sin `suma` = la cifra cambio entera: carga, reinicio, nuevo total).
 */
const CONTADORES = {
  viewers: {
    metrica: 'viewers',
    iniciar({ vistaPrevia, alCambio }, estadisticas) {
      // En la vista previa, sin espectadores reales se muestra una cifra de ejemplo.
      const avisar = (valor) => alCambio({ valor: Number(valor) || (vistaPrevia ? MUESTRA_VIEWERS : 0) });
      avisar(estadisticas.viewerCount);
      return (mensaje) => { if (mensaje.type === 'viewers') avisar(mensaje.total); };
    },
  },
  'contador-likes': {
    metrica: 'likes',
    iniciar({ vistaPrevia, alCambio }, estadisticas) {
      // ponytail: al recargar en pleno directo arranca de la suma del ranking (top
      // limitado), asi que puede quedar corto; pasar a un total real si el backend lo expone.
      let total = sumarLikes(estadisticas.topLikers || []);
      if (!total && vistaPrevia) total = sumarLikes(MUESTRA_LIKES);
      const sumar = (cantidad) => {
        if (cantidad <= 0) return;
        total += cantidad;
        alCambio({ valor: total, suma: cantidad });
      };
      alCambio({ valor: total });
      // La vista previa simula likes para ver las animaciones con los ajustes elegidos.
      if (vistaPrevia) setInterval(() => sumar(Math.ceil(Math.random() * 40)), PAUSA_LIKES_DEMO_MS);
      return (mensaje) => {
        if (mensaje.type === 'like') sumar(mensaje.likeCount || 0);
        if (mensaje.type === 'connected' && mensaje.isFirst) { total = 0; alCambio({ valor: 0 }); }
      };
    },
  },
};

export const metricaDe = (overlay) => CONTADORES[overlay].metrica;

/**
 * Datos de un contador (viewers, contador-likes), comun al overlay de la app y a los .epik.
 * alConfig(config): cambio de ajustes de la app (accesibilidad).
 */
export async function iniciarFuenteContador(overlay, { vistaPrevia, alCambio, alConfig }) {
  const alMensaje = CONTADORES[overlay].iniciar({ vistaPrevia, alCambio }, await pedirEstadisticas());
  conectarWSOverlay((mensaje) => {
    alMensaje(mensaje);
    if (mensaje.type === 'config-updated') alConfig(mensaje.config || {});
  });
}
