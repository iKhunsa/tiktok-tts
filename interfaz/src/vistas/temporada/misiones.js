// Misiones del pase, en orden: cada una es un paso de la fila. `id` = clave de texto en temporada.pase.misiones.<id> y
// nombre de su icono; `monedas` es lo que gana el streamer al cumplirla.
export const MISIONES = [
  { id: 'nuevoSeguidor', monedas: 50 },
  { id: 'daleAlPlay', monedas: 50 },
  { id: 'uneteAlClan', monedas: 50 },
  { id: 'calentandoMotores', monedas: 100 },
  { id: 'modoImparable', monedas: 200 },
  { id: 'cambioDeLook', monedas: 100 },
  { id: 'sinFronteras', monedas: 100 },
  { id: 'chatEnLlamas', monedas: 200 },
  { id: 'djDelDirecto', monedas: 100 },
];

export const sumarRecompensas = (misiones) => misiones.reduce((suma, mision) => suma + mision.monedas, 0);
