import { elegirEvento } from '../eventos/catalogo.js';
import { winter } from './winter.js';

/** Temporadas conocidas. Agregar una = archivo nuevo (como winter.js) + una linea aqui. */
export const TEMPORADAS = [winter];

/** La temporada cuya ventana de fechas incluye `fecha`, o la forzada por id (pruebas: `?temporada=winter`). */
export const temporadaVigente = (fecha = new Date(), forzadaId = null) => elegirEvento(TEMPORADAS, fecha, forzadaId);

/** Id forzado desde la URL de la pagina (`?temporada=winter`); sin parametro, null. */
export const temporadaForzada = (busqueda = globalThis.location?.search ?? '') => new URLSearchParams(busqueda).get('temporada');
