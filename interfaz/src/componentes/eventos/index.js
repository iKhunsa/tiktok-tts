/**
 * Eventos visuales de temporada (animaciones breves sobre la UI). Las vistas
 * solo llaman a estas funciones; cada evento vive en su propia carpeta y se
 * registra en catalogo.js. El usuario puede apagarlos todos con el ajuste
 * `eventEffects` (activo por defecto).
 */
import { EVENTOS, elegirEvento } from './catalogo.js';
import { reproducir, detener } from './reproducir.js';
import { appSettings } from '../../nucleo/estado/ajustes-app.js';

let eventoActivoReproducido = false;

const eventoDeHoy = () => elegirEvento(EVENTOS, new Date());

export const efectosActivados = () => appSettings.eventEffects !== false;

/** ¿Hay un evento de temporada vigente hoy? (la UI muestra el boton de apagado solo entonces). */
export const hayEventoActivo = () => !!eventoDeHoy();

/** Una vez por carga de ventana: el evento cuya ventana de fechas incluye hoy, si hay y esta activado. */
export function reproducirEventoActivo() {
  if (eventoActivoReproducido) return;
  eventoActivoReproducido = true;
  // aplicarSesion avisa antes de cargar los ajustes de la cuenta (mismo tick):
  // se lee el ajuste en el siguiente microtask para no usar los de otra cuenta.
  Promise.resolve().then(() => {
    const evento = eventoDeHoy();
    if (evento && efectosActivados()) reproducir(evento);
  });
}

/** Muestra el evento vigente ahora (al reactivar los efectos desde el boton). */
export function previsualizarEventoActivo() {
  const evento = eventoDeHoy();
  if (evento) reproducir(evento);
}

/** Corta lo que este en pantalla (al desactivar los efectos). */
export const detenerEvento = detener;

/** Fuerza un evento por id, ignorando fecha, ajuste y guard (pruebas: `?evento=halloween`). */
export function reproducirEvento(id) {
  const evento = elegirEvento(EVENTOS, new Date(), id);
  if (evento) reproducir(evento);
}
