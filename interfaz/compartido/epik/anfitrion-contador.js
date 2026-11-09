import { iniciarFuenteContador, metricaDe } from '../fuente-contador.js';
import { prepararEpik } from './anfitrion.js';

// El mismo titulo que pinta el overlay de la app.
const TITULO = { viewers: 'overlayStr.viewers', 'contador-likes': 'overlayCat.ov.contador-likes.titulo' };

/**
 * .epik de la familia `contador` (viewers, contador-likes). Contrato publico, documentado en la
 * ficha del kit: evento `contador` = { metrica: 'viewers'|'likes', valor, suma, meta: { desde, hasta } | null }.
 * `suma` > 0 cuando acaba de entrar algo (un seguidor, likes); 0 cuando la cifra cambio entera.
 */
export async function iniciar(overlay, nativo) {
  const epik = await prepararEpik({ familia: 'contador', overlay, textos: (t) => ({ titulo: t(TITULO[overlay]) }), nativo });
  if (!epik) return;
  iniciarFuenteContador(overlay, {
    vistaPrevia: epik.vistaPrevia,
    alCambio: ({ valor, suma = 0 }) => epik.enviar('contador', {
      metrica: metricaDe(overlay),
      valor,
      suma,
      meta: null,
    }),
    alConfig: epik.alConfig,
  });
}
