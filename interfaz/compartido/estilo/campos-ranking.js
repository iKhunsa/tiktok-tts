import { camposAlineacionVertical } from './campos-alineacion.js';
import { campoEscala, camposTipografia, camposUsuario } from './campos-tipografia.js';

/**
 * Esquema de Top Likers / Top Donadores: misma estructura, cambia solo el
 * color del valor (corazones vs. monedas).
 * `activa`: tocar el campo prende ese bool (la opacidad no se ve sin placa).
 */
// Skins del ranking: cambian la forma de cada fila, no sus colores. Se eligen desde la vista previa.
export const SKINS_RANKING = ['clasica', 'cristal', 'neon', 'minimal', 'bloque'];
/** Estilos de ranking de la seccion Explorar, incluidos en Pro. */
export const SKINS_RANKING_PREMIUM = ['podio', 'pixel', 'cinta'];

export const camposRanking = ({ colorValor }) => [
  { clave: 'skin', param: 'skin', tipo: 'opcion', def: SKINS_RANKING[0], opciones: [...SKINS_RANKING, ...SKINS_RANKING_PREMIUM], libres: SKINS_RANKING, premium: SKINS_RANKING_PREMIUM, ui: 'oculto', grupo: 'skin' },
  campoEscala(),
  { clave: 'rows', param: 'rows', tipo: 'numero', def: 10, min: 3, max: 20, step: 1, etiqueta: 'maxFilas', grupo: 'base' },
  { clave: 'color', param: 'color', tipo: 'color', def: '#FFBB00', etiqueta: 'colorAcento', grupo: 'base' },
  ...camposTipografia(16),
  ...camposAlineacionVertical({ posicionV: 'arriba' }),
  ...camposUsuario(),
  { clave: 'colorValor', param: 'pc', tipo: 'color', def: colorValor, grupo: 'ranking' },
  { clave: 'colorRango', param: 'rc', tipo: 'color', def: '#d9d9d9', grupo: 'ranking' },
  { clave: 'placa', param: 'plate', tipo: 'bool', def: false, grupo: 'ranking' },
  { clave: 'colorPlaca', param: 'platec', tipo: 'color', def: '#212121', grupo: 'ranking', activa: 'placa' },
  { clave: 'bg', param: 'bg', tipo: 'numero', def: 0.6, min: 0.1, max: 1, step: 0.05, ui: 'rango', porcentaje: true, etiqueta: 'opacidadPlaca', grupo: 'ranking', activa: 'placa' },
  { clave: 'mostrarRango', param: 'rank', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarValor', param: 'val', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarSimbolo', param: 'sym', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarAvatares', param: 'av', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarCorona', param: 'crown', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'mostrarMedallas', param: 'medal', tipo: 'bool', def: true, grupo: 'ranking' },
  { clave: 'derechaAIzquierda', param: 'rtl', tipo: 'bool', def: false, grupo: 'alineacion', espeja: ['alineacionTexto'] },
];
