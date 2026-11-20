import { get, set } from '../../nucleo/estado/datos-por-cuenta.js';

// Por cuenta: quien ya vio el anuncio de una temporada no lo vuelve a ver, ni siquiera si cambia de equipo con la misma cuenta
// (mientras el almacen local persista) ni mientras la temporada siga vigente.
const clave = (id) => `temporadaAnunciada_${id}`;

export const temporadaAnunciada = (id) => get(clave(id)) === '1';
export const marcarTemporadaAnunciada = (id) => set(clave(id), '1');

// La guia que senala el boton de la barra de titulo sale al cerrar la ventana de la temporada, pero solo las primeras veces:
// se cuenta cuantas veces se mostro (un '1' guardado por versiones anteriores cuenta como una).
const claveGuia = (id) => `temporadaGuiaVista_${id}`;
export const guiasTemporadaVistas = (id) => Number(get(claveGuia(id))) || 0;
export const registrarGuiaTemporadaVista = (id) => set(claveGuia(id), String(guiasTemporadaVistas(id) + 1));
