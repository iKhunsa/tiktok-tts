import { avatarGenerado } from '../avatar-generado.js';
import { RANKINGS, iniciarFuenteRanking } from '../fuente-ranking.js';
import { prepararEpik } from './anfitrion.js';

const absoluta = (url) => (url ? new URL(url, location.href).href : null);

/**
 * .epik de la familia `ranking` (Top Likers y Top Donadores). Contrato publico, documentado en la ficha
 * del kit: evento `ranking` = { metrica: 'likes'|'monedas', lista: [{ puesto, usuario, avatar, avatarRespaldo, valor }], animado }.
 */
export async function iniciar(overlay, nativo) {
  const ranking = RANKINGS[overlay];
  const epik = await prepararEpik({
    familia: 'ranking',
    overlay,
    textos: (t) => ({ vacio: t(ranking.claveTextoVacio) }),
    nativo,
  });
  if (!epik) return;
  iniciarFuenteRanking(ranking, {
    vistaPrevia: epik.vistaPrevia,
    alLista: (entradas, animado) => epik.enviar('ranking', {
      metrica: ranking.metrica,
      animado,
      lista: entradas.map((entrada, indice) => ({
        puesto: indice + 1,
        usuario: entrada.user,
        avatar: absoluta(entrada.avatar),
        avatarRespaldo: avatarGenerado(entrada.user),
        valor: entrada[ranking.campoValor] || 0,
      })),
    }),
    alConfig: epik.alConfig,
  });
}
