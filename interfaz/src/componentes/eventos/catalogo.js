/**
 * Catalogo de eventos. Agregar un evento = carpeta nueva + una linea aqui.
 * Contrato: { id, ventana: {desde:'MM-DD', hasta:'MM-DD'}, recursos: [urls],
 *             sonidos: [{src, volumen 0-1}] (opcional), duracionMs, montar(capa, anclas) -> (limpiar?) }  // anclas: ver anclas.js
 */
import { halloween } from './halloween/index.js';

export const EVENTOS = [halloween];

const aMesDia = (fecha) => `${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

function enVentana({ desde, hasta }, fecha) {
  const hoy = aMesDia(fecha);
  // Ventana que cruza fin de ano (ej. 12-20 -> 01-06).
  return desde <= hasta ? hoy >= desde && hoy <= hasta : hoy >= desde || hoy <= hasta;
}

/** Evento forzado por id (pruebas) o el primero cuya ventana contiene `fecha`. */
export function elegirEvento(eventos, fecha, forzadoId) {
  if (forzadoId) return eventos.find((e) => e.id === forzadoId) || null;
  return eventos.find((e) => enVentana(e.ventana, fecha)) || null;
}
