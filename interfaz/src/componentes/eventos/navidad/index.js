import { montarEscena, RECURSOS, DURACION_MS } from './escena.js';

export const navidad = {
  id: 'navidad',
  ventana: { desde: '12-01', hasta: '01-06' }, // MM-DD inclusive; cruza fin de ano (prueba fuera de fechas: ?evento=navidad)
  recursos: RECURSOS,
  sonidos: [],
  duracionMs: DURACION_MS,
  montar: montarEscena,
};
