import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './i18n-overlay.js';
import { leerParametros } from './parametros.js';
import { conectarWSOverlay } from './ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './accesibilidad.js';
import { registrarErroresOverlay } from './registrar-errores.js';
import { leerConfig } from './estilo/query.js';
import { aplicarTipografia } from './estilo/aplicar-tipografia.js';
import { crearLeaderboard } from './leaderboard.js';
import { esVistaPrevia, conMuestra } from './vista-previa.js';

async function pedirRankingInicial(claveLista) {
  try {
    const estadisticas = await (await fetch('/api/overlay-stats')).json();
    return Array.isArray(estadisticas[claveLista]) ? estadisticas[claveLista] : [];
  } catch {
    return [];
  }
}

/**
 * Arranque comun de los overlays de ranking. El servidor es la fuente de
 * verdad: manda el top ya ordenado (estado inicial por HTTP, cambios por
 * WebSocket) y el overlay solo lo pinta.
 *
 * ranking: { esquema, claveLista, tipoMensajeWs, campoValor, simboloHtml, claveTextoVacio, muestra }
 * `muestra`: entradas de ejemplo que la vista previa pinta mientras no hay datos reales.
 */
export async function iniciarRanking(ranking) {
  registrarErroresOverlay();
  const aplicarAccesibilidad = iniciarAccesibilidadOverlay();

  const params = leerParametros();
  const vistaPrevia = esVistaPrevia(params);
  const cfg = leerConfig(ranking.esquema, params);
  aplicarTipografia(cfg);

  const [entradasIniciales] = await Promise.all([pedirRankingInicial(ranking.claveLista), cargarLocaleOverlay()]);
  aplicarI18nOverlay();

  const leaderboard = crearLeaderboard(cfg, {
    campoValor: ranking.campoValor,
    simboloHtml: ranking.simboloHtml,
    textoVacio: t(ranking.claveTextoVacio),
  });
  const conEjemplo = (entradas) => conMuestra(entradas, ranking.muestra, vistaPrevia);
  leaderboard.pintar(conEjemplo(entradasIniciales));

  conectarWSOverlay((mensaje) => {
    if (mensaje.type === ranking.tipoMensajeWs) leaderboard.pintarAnimado(conEjemplo(mensaje[ranking.claveLista]));
    else if (mensaje.type === 'connected' && mensaje.isFirst) leaderboard.pintar(conEjemplo([]));
    else if (mensaje.type === 'config-updated') aplicarAccesibilidad(mensaje.config || {});
  });
}
