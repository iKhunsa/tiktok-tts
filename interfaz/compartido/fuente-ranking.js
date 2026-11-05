import { conectarWSOverlay } from './ws-cliente.js';
import { conMuestra } from './vista-previa.js';
import { MUESTRA_LIKES, MUESTRA_DONADORES } from './muestras-vista-previa.js';

/** Lo que cambia entre rankings (datos); el simbolo y el pintado los pone cada overlay. */
export const RANKINGS = {
  likes: { claveLista: 'topLikers', tipoMensajeWs: 'top-likers', campoValor: 'totalLikes', claveTextoVacio: 'overlayStr.waitingLikes', metrica: 'likes', muestra: MUESTRA_LIKES },
  donadores: { claveLista: 'topDonors', tipoMensajeWs: 'top-donors', campoValor: 'totalCoins', claveTextoVacio: 'overlayStr.waitingDonors', metrica: 'monedas', muestra: MUESTRA_DONADORES },
};

async function pedirRankingInicial(claveLista) {
  try {
    const estadisticas = await (await fetch('/api/overlay-stats')).json();
    return Array.isArray(estadisticas[claveLista]) ? estadisticas[claveLista] : [];
  } catch {
    return [];
  }
}

const PAUSA_SIMULACION_MS = 1800;

// Vista previa sin datos reales: los valores suben y las filas se adelantan, como en directo.
function simularRanking({ muestra, campoValor }, alLista, hayDatosReales) {
  let entradas = muestra.map((entrada) => ({ ...entrada }));
  setInterval(() => {
    if (hayDatosReales()) return;
    const indice = 1 + Math.floor(Math.random() * (entradas.length - 1));
    const elegida = entradas[indice];
    // La mitad de las veces alcanza y pasa al de arriba; si no, solo suma un poco.
    const meta = Math.random() < 0.5 ? entradas[indice - 1][campoValor] : elegida[campoValor];
    elegida[campoValor] = meta + 1 + Math.floor(Math.random() * 300);
    entradas = [...entradas].sort((a, b) => b[campoValor] - a[campoValor]);
    alLista(entradas, true);
  }, PAUSA_SIMULACION_MS);
}

/**
 * Datos de un ranking (Top Likers / Top Donadores), comun al overlay de la app y a los .epik.
 * El servidor es la fuente de verdad: manda el top ya ordenado (inicial por HTTP, cambios por WS).
 * alLista(entradas, animado): la lista entera cada vez. alConfig(config): cambio de ajustes de la app.
 */
export async function iniciarFuenteRanking(ranking, { vistaPrevia, alLista, alConfig }) {
  const conEjemplo = (entradas) => conMuestra(entradas, ranking.muestra, vistaPrevia);
  const iniciales = await pedirRankingInicial(ranking.claveLista);
  alLista(conEjemplo(iniciales), false);
  let hayDatosReales = iniciales.length > 0;
  if (vistaPrevia) simularRanking(ranking, alLista, () => hayDatosReales);

  conectarWSOverlay((mensaje) => {
    if (mensaje.type === ranking.tipoMensajeWs) {
      hayDatosReales = mensaje[ranking.claveLista].length > 0;
      alLista(conEjemplo(mensaje[ranking.claveLista]), true);
    } else if (mensaje.type === 'connected' && mensaje.isFirst) alLista(conEjemplo([]), false);
    else if (mensaje.type === 'config-updated') alConfig(mensaje.config || {});
  });
}
