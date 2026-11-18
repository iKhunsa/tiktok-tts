'use strict';

// Modelo del overlay de teclado (features/overlay + interfaz/overlay-teclado.js):
// `tecladoKeys` es una LISTA ordenada de entradas { key, w } elegidas por el
// streamer (no un set fijo de slots) — agregar hace push, quitar hace splice,
// reordenar es intercambiar dos posiciones de la lista (nunca mover por
// pixeles), y `w` es el ancho de esa tecla en unidades (una tecla normal = 1,
// TAB/SHIFT/SPACE suelen ser mas anchas en un teclado real). La posicion en
// el overlay sale del indice en la lista, acomodada en filas que no superan
// FILA_ANCHO_MAX unidades (interfaz/overlay-teclado.js).
const MAX_TECLADO_KEYS = 20;
const MIN_TECLADO_KEYS = 1;
const MAX_CUSTOM_PRESETS = 12;
const MAX_PRESET_NAME_LEN = 24;

// Universo de teclas fisicas que electron-shell/uiohook.js sabe reconocer por
// nombre (letras, digitos, F1-F12, Space/Tab/Shift-izquierdo). Deliberadamente
// no incluye Ctrl/Alt/flechas/etc: son nombres de constante de uiohook-napi
// que no estan ya probados en este codebase y una adivinanza mal escrita
// quedaria muda en vez de fallar fuerte.
const ALLOWED_TECLADO_KEYS = [
  ...'QWERTYUIOPASDFGHJKLZXCVBNM'.split(''),
  ...'0123456789'.split(''),
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
  'SPACE', 'TAB', 'SHIFT',
];

// Anchos permitidos, en "unidades" (1 unidad = una tecla normal tipo Q/W/E).
const ALLOWED_TECLADO_WIDTHS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const k = (key, w = 1) => ({ key, w });

// El layout que tenia el overlay antes de poder personalizarlo (mitad
// izquierda de teclado tipo Inkput, con TAB/SHIFT/SPACE mas anchas que el
// resto) — sigue siendo el default de una cuenta nueva.
const DEFAULT_TECLADO_KEYS = [
  k('TAB', 1.25), k('Q'), k('W'), k('E'), k('R'),
  k('A'), k('S'), k('D'), k('F'),
  k('SHIFT', 2), k('Z'), k('X'), k('C'),
  k('SPACE', 3),
];

// Presets de teclas que streamers de verdad usan en esos generos (no
// combinaciones inventadas): cada uno reemplaza la lista completa.
const TECLADO_PRESETS = {
  default: DEFAULT_TECLADO_KEYS,
  // Cluster de movimiento puro, el bind mas universal de PC gaming.
  wasd: [k('W'), k('A'), k('S'), k('D'), k('SPACE', 3), k('SHIFT', 2)],
  // Movimiento corrido un lugar a la derecha (E/S/D/F) para tener Q/W/R/TAB
  // libres a mano — usado por jugadores de RTS/FPS con remap ergonomico.
  esdf: [k('TAB', 1.25), k('Q'), k('W'), k('E'), k('S'), k('D'), k('F'), k('R'), k('SHIFT', 2), k('SPACE', 3)],
  // MOBA (League of Legends / Dota 2): Q/W/E/R hechizos, A ataque-y-mueve,
  // S alto, D/F invocador/items, Shift auto-cast, Space centra camara,
  // 1/2/3 objetos/trinket.
  moba: [k('TAB', 1.25), k('Q'), k('W'), k('E'), k('R'), k('A'), k('S'), k('D'), k('F'), k('SHIFT', 2), k('SPACE', 3), k('1'), k('2'), k('3')],
  // FPS (Valorant/CS/CoD): WASD movimiento, Space salto, Shift caminar,
  // R recarga, Q/E uso-habilidad, Tab marcador, G granada.
  fps: [k('TAB', 1.25), k('Q'), k('W'), k('E'), k('R'), k('A'), k('S'), k('D'), k('F'), k('SHIFT', 2), k('SPACE', 3), k('G')],
  // MMO (WoW y similares): barra de accion en 1-9 + QWER.
  mmo: [k('1'), k('2'), k('3'), k('4'), k('5'), k('6'), k('7'), k('8'), k('9'), k('Q'), k('W'), k('E'), k('R')],
  // Rhythm (osu! y similares): solo 2 teclas, el resto es el mouse.
  rhythm: [k('Z', 1.5), k('X', 1.5)],
};

function isValidTecladoEntry(e) {
  return !!e && typeof e === 'object' && ALLOWED_TECLADO_KEYS.includes(e.key) && ALLOWED_TECLADO_WIDTHS.includes(e.w);
}

function isValidTecladoKeys(v) {
  if (!Array.isArray(v)) return false;
  if (v.length < MIN_TECLADO_KEYS || v.length > MAX_TECLADO_KEYS) return false;
  if (!v.every(isValidTecladoEntry)) return false;
  return new Set(v.map((e) => e.key)).size === v.length; // sin teclas repetidas
}

// Presets que el usuario guarda desde la app (ademas de los de arriba):
// { id, nombre, keys }. `id` solo necesita ser un string no vacio (lo genera
// el front con crypto.randomUUID()) — no se valida formato UUID especifico
// para no acoplar el backend a como el front arma el id.
function isValidTecladoCustomPresets(v) {
  if (!Array.isArray(v) || v.length > MAX_CUSTOM_PRESETS) return false;
  return v.every((p) => p && typeof p === 'object'
    && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 64
    && typeof p.nombre === 'string' && p.nombre.trim().length > 0 && p.nombre.length <= MAX_PRESET_NAME_LEN
    && isValidTecladoKeys(p.keys));
}

module.exports = {
  MAX_TECLADO_KEYS, MIN_TECLADO_KEYS, MAX_CUSTOM_PRESETS, MAX_PRESET_NAME_LEN,
  ALLOWED_TECLADO_KEYS, ALLOWED_TECLADO_WIDTHS, DEFAULT_TECLADO_KEYS, TECLADO_PRESETS,
  isValidTecladoKeys, isValidTecladoCustomPresets,
};
