const ALINEACIONES_TEXTO = ['izquierda', 'centro', 'derecha', 'justificado'];
const POSICIONES_H = ['izquierda', 'centro', 'derecha'];
const POSICIONES_V = ['arriba', 'centro', 'abajo'];
const ICONOS_TEXTO = { izquierda: 'format_align_left', centro: 'format_align_center', derecha: 'format_align_right', justificado: 'format_align_justify' };

const campoOpcion = (clave, param, opciones, def, extra) => (
  { clave, param, tipo: 'opcion', def, opciones, opcionesTraducidas: opciones, grupo: 'alineacion', ...extra }
);

// Desplazamiento libre desde la posicion elegida, como fraccion del tamano de la fuente de OBS.
const campoMover = (clave, param) => ({ clave, param, tipo: 'numero', def: 0, min: -1, max: 1, step: 0.005, ui: 'rango', porcentaje: true, grupo: 'alineacion' });
// Orden de apilado en el lienzo unificado (mayor queda por encima). Sin control en el panel: se cambia desde el menu de la capa del editor.
const campoZ = () => ({ clave: 'capaZ', param: 'z', tipo: 'numero', def: 0, min: -30, max: 30, step: 1, ui: 'oculto', grupo: 'alineacion' });
// Giro 3D sobre el eje vertical, como una puerta que se abre: 0 = de frente, +/- = hacia un lado u otro.
const campoRotar = () => ({ clave: 'rotaY', param: 'ry', tipo: 'numero', def: 0, min: -80, max: 80, step: 1, ui: 'rango', grupo: 'base' });
export const camposMover = () => [campoMover('desplazaX', 'dx'), campoMover('desplazaY', 'dy'), campoZ(), campoRotar()];

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
