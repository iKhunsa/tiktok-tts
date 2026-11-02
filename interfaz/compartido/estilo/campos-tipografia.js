import { FUENTE_SISTEMA, FUENTES_DISPONIBLES, EFECTOS_TEXTO } from './fuentes.js';

// `auto` respeta el peso propio de cada texto (nombres en negrita, mensaje normal).
const PESOS = ['auto', '300', '400', '500', '600', '700', '800', '900'];
const MAYUSCULAS = ['none', 'uppercase', 'lowercase', 'capitalize'];
const SIMBOLOS_MAYUSCULAS = { none: '—', uppercase: 'AB', lowercase: 'ab', capitalize: 'Ab' };

/** Zoom de todo el overlay: texto, mensajes y separaciones, sin cambiar sus proporciones. */
export const campoEscala = () => ({ clave: 'escala', param: 'zoom', tipo: 'numero', def: 1, min: 0.1, max: 2, step: 0.05, ui: 'rango', porcentaje: true, grupo: 'base' });

/** Tipografia comun a los 3 overlays con texto. */
export const camposTipografia = (tamanoPorDefecto) => [
  { clave: 'fuente', param: 'font', tipo: 'opcion', def: FUENTE_SISTEMA, opciones: FUENTES_DISPONIBLES, opcionesTraducidas: [FUENTE_SISTEMA], grupo: 'tipografia' },
  { clave: 'peso', param: 'fw', tipo: 'opcion', def: PESOS[0], opciones: PESOS, opcionesTraducidas: PESOS, grupo: 'tipografia' },
  { clave: 'tamano', param: 'size', tipo: 'numero', def: tamanoPorDefecto, min: 10, max: 60, step: 1, ui: 'rango', grupo: 'tipografia' },
  { clave: 'interlineado', param: 'lh', tipo: 'numero', def: 1.4, min: 1, max: 2.5, step: 0.1, ui: 'rango', grupo: 'tipografia', subtitulo: 'espaciado' },
  { clave: 'espaciadoLetras', param: 'ls', tipo: 'numero', def: 0, min: -1, max: 6, step: 0.5, ui: 'rango', etiqueta: 'entreLetras', grupo: 'tipografia' },
  { clave: 'espaciadoPalabras', param: 'ws', tipo: 'numero', def: 0, min: -2, max: 20, step: 1, ui: 'rango', etiqueta: 'entrePalabras', grupo: 'tipografia' },
  { clave: 'mayusculas', param: 'case', tipo: 'opcion', def: MAYUSCULAS[0], opciones: MAYUSCULAS, opcionesTraducidas: MAYUSCULAS, ui: 'botones', simbolos: SIMBOLOS_MAYUSCULAS, grupo: 'tipografia', subtitulo: 'estilo' },
  { clave: 'cursiva', param: 'it', tipo: 'bool', def: false, grupo: 'tipografia' },
  { clave: 'subrayado', param: 'ul', tipo: 'bool', def: false, grupo: 'tipografia' },
  { clave: 'contornoGrosor', param: 'sw', tipo: 'numero', def: 0, min: 0, max: 6, step: 0.5, ui: 'rango', grupo: 'tipografia', subtitulo: 'efectos' },
  { clave: 'contornoColor', param: 'sc', tipo: 'color', def: '#000000', grupo: 'tipografia', dependeDe: 'contornoGrosor' },
  { clave: 'sombra', param: 'sh', tipo: 'bool', def: false, grupo: 'tipografia' },
  { clave: 'sombraColor', param: 'shc', tipo: 'color', def: '#000000', grupo: 'tipografia', dependeDe: 'sombra' },
  { clave: 'sombraDifuminado', param: 'shb', tipo: 'numero', def: 4, min: 0, max: 20, step: 1, ui: 'rango', grupo: 'tipografia', dependeDe: 'sombra' },
];

/** Estilo del nombre de usuario en los rankings (el chat lo define por rol). */
export const camposUsuario = () => [
  { clave: 'colorUsuario', param: 'uc', tipo: 'color', def: '#ffffff', grupo: 'usuario' },
  { clave: 'efectoUsuario', param: 'fx', tipo: 'opcion', def: EFECTOS_TEXTO[0], opciones: EFECTOS_TEXTO, opcionesTraducidas: EFECTOS_TEXTO, grupo: 'usuario' },
  { clave: 'olaUsuario', param: 'wave', tipo: 'bool', def: false, grupo: 'usuario' },
];
