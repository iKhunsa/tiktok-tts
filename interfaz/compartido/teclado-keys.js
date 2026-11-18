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

export const ALLOWED_TECLADO_KEYS = [
  ...'QWERTYUIOPASDFGHJKLZXCVBNM'.split(''),
  ...'0123456789'.split(''),
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
  'SPACE', 'TAB', 'SHIFT',
];

export const ALLOWED_TECLADO_WIDTHS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const k = (key, w = 1) => ({ key, w });

export const DEFAULT_TECLADO_KEYS = [
  k('TAB', 1.25), k('Q'), k('W'), k('E'), k('R'),
  k('A'), k('S'), k('D'), k('F'),
  k('SHIFT', 2), k('Z'), k('X'), k('C'),
  k('SPACE', 3),
];

export const TECLADO_PRESETS = {
  default: DEFAULT_TECLADO_KEYS,
  wasd: [k('W'), k('A'), k('S'), k('D'), k('SPACE', 3), k('SHIFT', 2)],
  esdf: [k('TAB', 1.25), k('Q'), k('W'), k('E'), k('S'), k('D'), k('F'), k('R'), k('SHIFT', 2), k('SPACE', 3)],
  moba: [k('TAB', 1.25), k('Q'), k('W'), k('E'), k('R'), k('A'), k('S'), k('D'), k('F'), k('SHIFT', 2), k('SPACE', 3), k('1'), k('2'), k('3')],
  fps: [k('TAB', 1.25), k('Q'), k('W'), k('E'), k('R'), k('A'), k('S'), k('D'), k('F'), k('SHIFT', 2), k('SPACE', 3), k('G')],
  mmo: [k('1'), k('2'), k('3'), k('4'), k('5'), k('6'), k('7'), k('8'), k('9'), k('Q'), k('W'), k('E'), k('R')],
  rhythm: [k('Z', 1.5), k('X', 1.5)],
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
    && preset.every((p, i) => p.key === keys[i].key && p.w === keys[i].w));
  return entry ? entry[0] : null;
}
