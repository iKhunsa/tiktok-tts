import { FUENTE_SISTEMA, FUENTES_DISPONIBLES, EFECTOS_TEXTO } from './fuentes.js';

/** Fuente, tamano, interlineado y espaciado: comunes a los 3 overlays con texto. */
export const camposTipografia = (tamanoPorDefecto) => [
  { clave: 'fuente', param: 'font', tipo: 'opcion', def: FUENTE_SISTEMA, opciones: FUENTES_DISPONIBLES, opcionesTraducidas: [FUENTE_SISTEMA], grupo: 'tipografia' },
  { clave: 'tamano', param: 'size', tipo: 'numero', def: tamanoPorDefecto, min: 10, max: 60, step: 1, ui: 'rango', grupo: 'tipografia' },
  { clave: 'interlineado', param: 'lh', tipo: 'numero', def: 1.4, min: 1, max: 2.5, step: 0.1, ui: 'rango', grupo: 'tipografia' },
  { clave: 'espaciadoLetras', param: 'ls', tipo: 'numero', def: 0, min: -1, max: 6, step: 0.5, ui: 'rango', grupo: 'tipografia' },
];

/** Estilo del nombre de usuario en los rankings (el chat lo define por rol). */
export const camposUsuario = () => [
  { clave: 'colorUsuario', param: 'uc', tipo: 'color', def: '#ffffff', grupo: 'usuario' },
  { clave: 'efectoUsuario', param: 'fx', tipo: 'opcion', def: EFECTOS_TEXTO[0], opciones: EFECTOS_TEXTO, opcionesTraducidas: EFECTOS_TEXTO, grupo: 'usuario' },
  { clave: 'olaUsuario', param: 'wave', tipo: 'bool', def: false, grupo: 'usuario' },
];
