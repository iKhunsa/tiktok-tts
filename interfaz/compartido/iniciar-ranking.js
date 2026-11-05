import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './i18n-overlay.js';
import { leerParametros } from './parametros.js';
import { iniciarAccesibilidadOverlay } from './accesibilidad.js';
import { registrarErroresOverlay } from './registrar-errores.js';
import { leerConfig } from './estilo/query.js';
import { aplicarTipografia } from './estilo/aplicar-tipografia.js';
import { aplicarAlineacion } from './estilo/aplicar-alineacion.js';
import { crearLeaderboard } from './leaderboard.js';
import { esVistaPrevia } from './vista-previa.js';
import { iniciarFuenteRanking } from './fuente-ranking.js';

/**
 * Arranque comun de los overlays de ranking: los datos salen de fuente-ranking.js
 * (la misma capa que usan los .epik) y aqui solo se pintan.
 *
 * ranking: un RANKINGS[id] de fuente-ranking.js mas { esquema, simboloHtml }.
 */
export async function iniciarRanking(ranking) {
  registrarErroresOverlay();
  const aplicarAccesibilidad = iniciarAccesibilidadOverlay();

  const params = leerParametros();
  const cfg = leerConfig(ranking.esquema, params);
  aplicarTipografia(cfg, 340);
  aplicarAlineacion(cfg);
  document.body.dataset.skin = cfg.skin;

  await cargarLocaleOverlay();
  aplicarI18nOverlay();

  const leaderboard = crearLeaderboard(cfg, {
    campoValor: ranking.campoValor,
    simboloHtml: ranking.simboloHtml,
    textoVacio: t(ranking.claveTextoVacio),
  });
  iniciarFuenteRanking(ranking, {
    vistaPrevia: esVistaPrevia(params),
    alLista: (entradas, animado) => (animado ? leaderboard.pintarAnimado(entradas) : leaderboard.pintar(entradas)),
    alConfig: aplicarAccesibilidad,
  });
}
