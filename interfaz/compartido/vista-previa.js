/**
 * Modo vista previa de los overlays: el iframe del configurador agrega
 * `preview=1` para que el overlay pinte datos de ejemplo cuando no hay datos
 * reales y se pueda personalizar sin estar en directo. La URL que se copia a OBS
 * nunca lleva este parametro.
 */
export const PARAM_VISTA_PREVIA = 'preview';

export const esVistaPrevia = (params) => params.get(PARAM_VISTA_PREVIA) === '1';

export function urlConVistaPrevia(url) {
  return `${url}${url.includes('?') ? '&' : '?'}${PARAM_VISTA_PREVIA}=1`;
}

// Sin datos reales y en vista previa se usa la muestra; con datos reales, siempre los reales.
export const conMuestra = (entradas, muestra, vistaPrevia) => (entradas.length || !vistaPrevia ? entradas : muestra);

// Alertas: reencola los eventos de ejemplo en bucle para ver la tarjeta entrar y salir sin parar.
export function repetirMuestra(encolar, eventos, intervaloMs) {
  let indice = 0;
  const siguiente = () => encolar(eventos[indice++ % eventos.length]);
  siguiente();
  return setInterval(siguiente, intervaloMs);
}
