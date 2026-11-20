import '../../estilos/temporada.css';
import { almacenSesion, appBloqueada } from '../../nucleo/estado/sesion.js';
import { temporadaForzada, temporadaVigente } from './catalogo.js';
import { temporadaAnunciada } from './estado.js';
import { iniciarBotonTemporada } from './boton.js';
import { mostrarAnuncio } from './anuncio.js';

export { marcarTemporadaPendiente } from './boton.js';

/**
 * Temporadas (eventos grandes, como Winter Season): el boton de la barra de titulo mientras haya una vigente y, la
 * primera vez que la cuenta abre la app dentro de esa ventana de fechas, la pantalla de bienvenida. Se llama con la
 * sesion ya leida: la cuenta decide si ya la vio, y con el login pendiente el anuncio espera a que entre.
 * Pruebas fuera de fechas: `?temporada=winter` (ignora la fecha y que ya se haya visto).
 */
export function iniciarTemporada() {
  const forzada = temporadaForzada();
  const temporada = temporadaVigente(new Date(), forzada);
  if (!temporada) return;
  iniciarBotonTemporada(temporada);

  let resuelto = false;
  const intentarAnuncio = () => {
    if (resuelto || appBloqueada()) return;
    resuelto = true;
    if (forzada || !temporadaAnunciada(temporada.id)) mostrarAnuncio(temporada);
  };
  intentarAnuncio();
  almacenSesion.subscribe(intentarAnuncio);
}
