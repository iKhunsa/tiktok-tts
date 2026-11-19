'use strict';

// Modelo del overlay de teclado (features/overlay + interfaz/overlay-teclado.js):
// `tecladoKeys` es una LISTA de entradas { key, w, row, col } elegidas por el
// streamer (no un set fijo de slots) — agregar hace push, quitar hace splice,
// mover una tecla es reescribir su row/col. `w` es el ancho de esa tecla en
// unidades (una tecla normal = 1, TAB/SHIFT/SPACE suelen ser mas anchas en un
// teclado real) y ocupa, en su fila `row`, las columnas [col, col+spanCols)
// con spanCols = Math.ceil(w) — el ancho real sigue siendo fraccionario para
// el tamano visual, pero la grilla de posicionamiento reserva celdas enteras.
// Unica invariante de datos: cada entrada entra en la grilla fija y ninguna
// pisa las celdas de otra (ver isValidTecladoKeys). Que el conjunto quede
// "pegado" (sin diagonales) es una guia del editor, no del dato persistido —
// borrar una tecla del medio puede partir el layout en dos grupos sin que
// eso sea un estado invalido.
const MAX_TECLADO_KEYS = 20;
const MIN_TECLADO_KEYS = 1;
const MAX_CUSTOM_PRESETS = 12;
const MAX_PRESET_NAME_LEN = 24;

// Grilla fija del canvas de posicionamiento. Peor caso teorico (20 teclas,
// todas con el ancho maximo 3) ocupa 60 celdas de las 80 — el margen es a
// proposito, para que "pegar sin diagonal" nunca se quede sin lugar.
const GRID_COLS = 10;
const GRID_ROWS = 8;

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

/** Cuantas celdas enteras de la grilla reserva una entrada en su fila. */
function spanCols(entry) { return Math.ceil(entry.w); }

/** Lista de celdas `{row, col}` que ocupa una entrada (para solape/adyacencia). */
function celdasOcupadas(entry) {
  return Array.from({ length: spanCols(entry) }, (_, i) => ({ row: entry.row, col: entry.col + i }));
}

const k = (key, w, row, col) => ({ key, w, row, col });

// El layout que tenia el overlay antes de poder personalizarlo (mitad
// izquierda de teclado tipo Inkput, con TAB/SHIFT/SPACE mas anchas que el
// resto) — sigue siendo el default de una cuenta nueva.
const DEFAULT_TECLADO_KEYS = [
  k('TAB', 1.25, 0, 0), k('Q', 1, 0, 2), k('W', 1, 0, 3), k('E', 1, 0, 4), k('R', 1, 0, 5),
  k('A', 1, 1, 0), k('S', 1, 1, 1), k('D', 1, 1, 2), k('F', 1, 1, 3),
  k('SHIFT', 2, 2, 0), k('Z', 1, 2, 2), k('X', 1, 2, 3), k('C', 1, 2, 4),
  k('SPACE', 3, 3, 0),
];

// Presets de teclas que streamers de verdad usan en esos generos (no
// combinaciones inventadas): cada uno reemplaza la lista completa.
const TECLADO_PRESETS = {
  default: DEFAULT_TECLADO_KEYS,
  // Cluster de movimiento puro, el bind mas universal de PC gaming.
  wasd: [
    k('W', 1, 0, 0), k('A', 1, 0, 1), k('S', 1, 0, 2), k('D', 1, 0, 3),
    k('SPACE', 3, 1, 0), k('SHIFT', 2, 1, 3),
  ],
  // Movimiento corrido un lugar a la derecha (E/S/D/F) para tener Q/W/R/TAB
  // libres a mano — usado por jugadores de RTS/FPS con remap ergonomico.
  esdf: [
    k('TAB', 1.25, 0, 0), k('Q', 1, 0, 2), k('W', 1, 0, 3), k('E', 1, 0, 4), k('S', 1, 0, 5),
    k('D', 1, 1, 0), k('F', 1, 1, 1), k('R', 1, 1, 2), k('SHIFT', 2, 1, 3),
    k('SPACE', 3, 2, 0),
  ],
  // MOBA (League of Legends / Dota 2): Q/W/E/R hechizos, A ataque-y-mueve,
  // S alto, D/F invocador/items, Shift auto-cast, Space centra camara,
  // 1/2/3 objetos/trinket.
  moba: [
    k('TAB', 1.25, 0, 0), k('Q', 1, 0, 2), k('W', 1, 0, 3), k('E', 1, 0, 4), k('R', 1, 0, 5),
    k('A', 1, 1, 0), k('S', 1, 1, 1), k('D', 1, 1, 2), k('F', 1, 1, 3),
    k('SHIFT', 2, 2, 0), k('SPACE', 3, 2, 2),
    k('1', 1, 3, 0), k('2', 1, 3, 1), k('3', 1, 3, 2),
  ],
  // FPS (Valorant/CS/CoD): WASD movimiento, Space salto, Shift caminar,
  // R recarga, Q/E uso-habilidad, Tab marcador, G granada.
  fps: [
    k('TAB', 1.25, 0, 0), k('Q', 1, 0, 2), k('W', 1, 0, 3), k('E', 1, 0, 4), k('R', 1, 0, 5),
    k('A', 1, 1, 0), k('S', 1, 1, 1), k('D', 1, 1, 2), k('F', 1, 1, 3),
    k('SHIFT', 2, 2, 0), k('SPACE', 3, 2, 2),
    k('G', 1, 3, 0),
  ],
  // MMO (WoW y similares): barra de accion en 1-9 + QWER.
  mmo: [
    k('1', 1, 0, 0), k('2', 1, 0, 1), k('3', 1, 0, 2), k('4', 1, 0, 3), k('5', 1, 0, 4),
    k('6', 1, 1, 0), k('7', 1, 1, 1), k('8', 1, 1, 2), k('9', 1, 1, 3), k('Q', 1, 1, 4),
    k('W', 1, 2, 0), k('E', 1, 2, 1), k('R', 1, 2, 2),
  ],
  // Rhythm (osu! y similares): solo 2 teclas, el resto es el mouse.
  rhythm: [k('Z', 1.5, 0, 0), k('X', 1.5, 0, 2)],
};

function isValidTecladoEntry(e) {
  return !!e && typeof e === 'object' && ALLOWED_TECLADO_KEYS.includes(e.key) && ALLOWED_TECLADO_WIDTHS.includes(e.w)
    && Number.isInteger(e.row) && e.row >= 0 && e.row < GRID_ROWS
    && Number.isInteger(e.col) && e.col >= 0 && e.col + spanCols(e) <= GRID_COLS;
}

/** Ninguna celda de la grilla puede estar ocupada por dos entradas a la vez. */
function sinSolape(v) {
  const ocupadas = new Set();
  for (const entry of v) {
    for (const { row, col } of celdasOcupadas(entry)) {
      const id = `${row},${col}`;
      if (ocupadas.has(id)) return false;
      ocupadas.add(id);
    }
  }
  return true;
}

function isValidTecladoKeys(v) {
  if (!Array.isArray(v)) return false;
  if (v.length < MIN_TECLADO_KEYS || v.length > MAX_TECLADO_KEYS) return false;
  if (!v.every(isValidTecladoEntry)) return false;
  if (new Set(v.map((e) => e.key)).size !== v.length) return false; // sin teclas repetidas
  return sinSolape(v);
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
  MAX_TECLADO_KEYS, MIN_TECLADO_KEYS, MAX_CUSTOM_PRESETS, MAX_PRESET_NAME_LEN, GRID_COLS, GRID_ROWS,
  ALLOWED_TECLADO_KEYS, ALLOWED_TECLADO_WIDTHS, DEFAULT_TECLADO_KEYS, TECLADO_PRESETS,
  spanCols, celdasOcupadas, isValidTecladoKeys, isValidTecladoCustomPresets,
};
