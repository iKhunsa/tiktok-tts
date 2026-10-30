const ALINEACIONES_TEXTO = ['izquierda', 'centro', 'derecha', 'justificado'];
const POSICIONES_H = ['izquierda', 'centro', 'derecha'];
const POSICIONES_V = ['arriba', 'centro', 'abajo'];
const ICONOS_TEXTO = { izquierda: 'format_align_left', centro: 'format_align_center', derecha: 'format_align_right', justificado: 'format_align_justify' };

const campoOpcion = (clave, param, opciones, def, extra) => (
  { clave, param, tipo: 'opcion', def, opciones, opcionesTraducidas: opciones, grupo: 'alineacion', ...extra }
);

// Desplazamiento libre desde la posicion elegida, como fraccion del tamano de la fuente de OBS.
const campoMover = (clave, param) => ({ clave, param, tipo: 'numero', def: 0, min: -1, max: 1, step: 0.005, ui: 'rango', porcentaje: true, grupo: 'alineacion' });
const camposMover = () => [campoMover('desplazaX', 'dx'), campoMover('desplazaY', 'dy')];

const alineacionTexto = () => campoOpcion('alineacionTexto', 'ta', ALINEACIONES_TEXTO, 'izquierda', { ui: 'botones', iconos: ICONOS_TEXTO });

/** Texto y posicion vertical, para overlays cuyas filas siempre ocupan todo el ancho. */
export const camposAlineacionVertical = ({ posicionV }) => [
  alineacionTexto(),
  campoOpcion('posicionV', 'py', POSICIONES_V, posicionV, { ui: 'botones' }),
  ...camposMover(),
];

/** Solo posicion: para overlays cuyo texto va centrado por diseno. */
export const camposPosicion = ({ posicionV }) => [
  campoOpcion('posicionH', 'px', POSICIONES_H, 'izquierda', { ui: 'oculto' }),
  campoOpcion('posicionV', 'py', POSICIONES_V, posicionV, { ui: 'rejilla', etiqueta: 'posicion', opcionesH: POSICIONES_H }),
  ...camposMover(),
];

/** Texto y posicion en los dos ejes: la rejilla de posicionV elige tambien posicionH. */
export const camposAlineacion = ({ posicionV }) => [
  alineacionTexto(),
  ...camposPosicion({ posicionV }),
];
