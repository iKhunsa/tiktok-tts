import { camposTipografia, camposUsuario } from './campos-tipografia.js';

/**
 * Esquema de Top Likers / Top Donadores: misma estructura, cambia solo el
 * color del valor (corazones vs. monedas).
 */
export const camposRanking = ({ colorValor }) => [
  { clave: 'rows', param: 'rows', tipo: 'numero', def: 10, min: 3, max: 20, step: 1, etiqueta: 'maxFilas', grupo: 'base' },
  { clave: 'color', param: 'color', tipo: 'color', def: '#FFBB00', etiqueta: 'colorAcento', grupo: 'base' },
  { clave: 'bg', param: 'bg', tipo: 'numero', def: 0.6, min: 0.1, max: 1, step: 0.05, ui: 'rango', porcentaje: true, etiqueta: 'opacidadPlaca', grupo: 'base' },
  ...camposTipografia(16),
  ...camposUsuario(),
  { clave: 'colorValor', param: 'pc', tipo: 'color', def: colorValor, grupo: 'ranking' },
  { clave: 'colorRango', param: 'rc', tipo: 'color', def: '#d9d9d9', grupo: 'ranking' },
  { clave: 'placa', param: 'plate', tipo: 'bool', def: false, grupo: 'ranking' },
  { clave: 'colorPlaca', param: 'platec', tipo: 'color', def: '#212121', grupo: 'ranking' },
  { clave: 'mostrarRango', param: 'rank', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarValor', param: 'val', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarSimbolo', param: 'sym', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarAvatares', param: 'av', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarCorona', param: 'crown', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarMedallas', param: 'medal', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'derechaAIzquierda', param: 'rtl', tipo: 'bool', def: false, grupo: 'ranking' },
];
