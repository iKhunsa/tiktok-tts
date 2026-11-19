/**
 * Espejo en ESM de core/teclado-keys.js (backend, CommonJS) — misma
 * convencion que el resto del repo para constantes que cruzan esa frontera
 * (ver CLAUDE.md). Si se tocan los presets/universo de teclas de un lado,
 * tocar el otro.
 */

export const MAX_TECLADO_KEYS = 20;
export const MIN_TECLADO_KEYS = 1;
export const MAX_CUSTOM_PRESETS = 12;
export const MAX_PRESET_NAME_LEN = 24;

export const GRID_COLS = 10;
export const GRID_ROWS = 8;

export const ALLOWED_TECLADO_KEYS = [
  ...'QWERTYUIOPASDFGHJKLZXCVBNM'.split(''),
  ...'0123456789'.split(''),
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
  'SPACE', 'TAB', 'SHIFT',
];

export const ALLOWED_TECLADO_WIDTHS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/** Cuantas celdas enteras de la grilla reserva una entrada en su fila. */
export function spanCols(entry) { return Math.ceil(entry.w); }

/** Lista de celdas `{row, col}` que ocupa una entrada (para solape/adyacencia). */
export function celdasOcupadas(entry) {
  return Array.from({ length: spanCols(entry) }, (_, i) => ({ row: entry.row, col: entry.col + i }));
}

const k = (key, w, row, col) => ({ key, w, row, col });

export const DEFAULT_TECLADO_KEYS = [
  k('TAB', 1.25, 0, 0), k('Q', 1, 0, 2), k('W', 1, 0, 3), k('E', 1, 0, 4), k('R', 1, 0, 5),
  k('A', 1, 1, 0), k('S', 1, 1, 1), k('D', 1, 1, 2), k('F', 1, 1, 3),
  k('SHIFT', 2, 2, 0), k('Z', 1, 2, 2), k('X', 1, 2, 3), k('C', 1, 2, 4),
  k('SPACE', 3, 3, 0),
];

export const TECLADO_PRESETS = {
  default: DEFAULT_TECLADO_KEYS,
  wasd: [
    k('W', 1, 0, 0), k('A', 1, 0, 1), k('S', 1, 0, 2), k('D', 1, 0, 3),
    k('SPACE', 3, 1, 0), k('SHIFT', 2, 1, 3),
  ],
  esdf: [
    k('TAB', 1.25, 0, 0), k('Q', 1, 0, 2), k('W', 1, 0, 3), k('E', 1, 0, 4), k('S', 1, 0, 5),
    k('D', 1, 1, 0), k('F', 1, 1, 1), k('R', 1, 1, 2), k('SHIFT', 2, 1, 3),
    k('SPACE', 3, 2, 0),
  ],
  moba: [
    k('TAB', 1.25, 0, 0), k('Q', 1, 0, 2), k('W', 1, 0, 3), k('E', 1, 0, 4), k('R', 1, 0, 5),
    k('A', 1, 1, 0), k('S', 1, 1, 1), k('D', 1, 1, 2), k('F', 1, 1, 3),
    k('SHIFT', 2, 2, 0), k('SPACE', 3, 2, 2),
    k('1', 1, 3, 0), k('2', 1, 3, 1), k('3', 1, 3, 2),
  ],
  fps: [
    k('TAB', 1.25, 0, 0), k('Q', 1, 0, 2), k('W', 1, 0, 3), k('E', 1, 0, 4), k('R', 1, 0, 5),
    k('A', 1, 1, 0), k('S', 1, 1, 1), k('D', 1, 1, 2), k('F', 1, 1, 3),
    k('SHIFT', 2, 2, 0), k('SPACE', 3, 2, 2),
    k('G', 1, 3, 0),
  ],
  mmo: [
    k('1', 1, 0, 0), k('2', 1, 0, 1), k('3', 1, 0, 2), k('4', 1, 0, 3), k('5', 1, 0, 4),
    k('6', 1, 1, 0), k('7', 1, 1, 1), k('8', 1, 1, 2), k('9', 1, 1, 3), k('Q', 1, 1, 4),
    k('W', 1, 2, 0), k('E', 1, 2, 1), k('R', 1, 2, 2),
  ],
  rhythm: [k('Z', 1.5, 0, 0), k('X', 1.5, 0, 2)],
};

/** DOM KeyboardEvent.code (estandar del navegador) -> nombre de tecla del universo de arriba, o null si no esta soportado. */
export function codigoDomAUniverso(code) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  if (code === 'Space') return 'SPACE';
  if (code === 'Tab') return 'TAB';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
  return null;
}

/** Siguiente ancho permitido en la direccion dada (1 = mas ancha, -1 = mas angosta), recortado a los extremos. */
export function siguienteAncho(w, direccion) {
  const i = ALLOWED_TECLADO_WIDTHS.indexOf(w);
  const base = i === -1 ? 0 : i;
  const next = Math.min(ALLOWED_TECLADO_WIDTHS.length - 1, Math.max(0, base + direccion));
  return ALLOWED_TECLADO_WIDTHS[next];
}

/** Que preset (de `presetsMap`, built-in + propios) coincide exactamente con la lista actual — null si es personalizado. */
export function presetActivo(keys, presetsMap) {
  if (!Array.isArray(keys)) return 'default';
  const entry = Object.entries(presetsMap).find(([, preset]) => preset.length === keys.length
    && preset.every((p, i) => p.key === keys[i].key && p.w === keys[i].w && p.row === keys[i].row && p.col === keys[i].col));
  return entry ? entry[0] : null;
}

function celdasLibres(keys, excluirKey) {
  const ocupadas = new Set();
  for (const entry of keys) {
    if (entry.key === excluirKey) continue;
    for (const { row, col } of celdasOcupadas(entry)) ocupadas.add(`${row},${col}`);
  }
  return ocupadas;
}

function cabenCeldas(ocupadas, row, col, span) {
  for (let i = 0; i < span; i += 1) if (ocupadas.has(`${row},${col + i}`)) return false;
  return true;
}

// Si alguna celda candidata queda pegada por borde (nunca solo por una
// esquina) a una celda ocupada por otra tecla. Deliberadamente LOCAL (solo
// mira la tecla que se esta soltando, no si el resto del tablero sigue
// siendo un unico grupo): exigir conectividad global en cada movimiento deja
// sin ningun destino posible a una tecla "puente" — la unica que conecta a
// otra con el resto — porque moverla aislaria a esa otra. Con la regla local
// esa tecla puente se puede mover a cualquier lado pegado a algo; si eso
// deja a otra tecla suelta, se arregla moviendola a ella tambien (nunca un
// candado sin salida).
function tocaAlguna(celdas, ocupadas) {
  for (const { row, col } of celdas) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (ocupadas.has(`${row + dr},${col + dc}`)) return true;
    }
  }
  return false;
}

/**
 * Celdas `{row, col}` donde se podria soltar `entry` (identificada por su
 * `key`) sin solapar ninguna otra tecla y quedando pegada a alguna. Con una
 * sola tecla en total, cualquier celda libre es valida.
 */
export function destinosValidos(keys, entry) {
  const span = spanCols(entry);
  const ocupadas = celdasLibres(keys, entry.key);
  const hayOtras = keys.some((e) => e.key !== entry.key);
  const destinos = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col + span <= GRID_COLS; col += 1) {
      if (!cabenCeldas(ocupadas, row, col, span)) continue;
      if (hayOtras && !tocaAlguna(celdasOcupadas({ ...entry, row, col }), ocupadas)) continue;
      destinos.push({ row, col });
    }
  }
  return destinos;
}

/** Primera celda libre (orden de grilla) que entra en los limites y, si ya hay teclas, queda pegada a alguna. */
export function primeraCeldaAdyacenteLibre(keys, w) {
  const span = spanCols({ w });
  if (!keys.length) return { row: 0, col: 0 };
  const ocupadas = celdasLibres(keys, null);
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col + span <= GRID_COLS; col += 1) {
      if (!cabenCeldas(ocupadas, row, col, span)) continue;
      if (tocaAlguna(celdasOcupadas({ w, row, col }), ocupadas)) return { row, col };
    }
  }
  return null;
}
