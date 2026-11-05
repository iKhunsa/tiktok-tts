import { camposAnimacion } from './campos-chat.js';

/** Skins exclusivas del Bot de Musica (seccion Explorar, incluidas en Pro). */
export const SKINS_MUSICA_PREMIUM = ['vinilo', 'widgetPequeno', 'widgetMediano', 'widgetGrande'];

/** Lo que muestra cada skin al elegirla; despues el usuario prende o apaga lo que quiera. */
// `base`: el resto de skins, para que al volver de un widget se vea todo otra vez.
export const PRESETS_SKIN_MUSICA = {
  base: { mostrarEtiqueta: true, mostrarPedido: true, mostrarBarra: true, mostrarTiempos: true, mostrarCola: false },
  widgetPequeno: { mostrarEtiqueta: false, mostrarPedido: false, mostrarBarra: false, mostrarTiempos: false, mostrarCola: false },
  widgetMediano: { mostrarEtiqueta: true, mostrarPedido: false, mostrarBarra: true, mostrarTiempos: false, mostrarCola: false },
  widgetGrande: { mostrarEtiqueta: false, mostrarPedido: false, mostrarBarra: true, mostrarTiempos: false, mostrarCola: true },
};

const LADOS = ['izquierda', 'derecha'];
// Que hacer con un titulo que no cabe: cortarlo con puntos, desvanecer el final o desplazarlo para leerlo entero.
const TEXTO_LARGO = ['cortar', 'desvanecer', 'desplazar'];
const ALINEACIONES = ['izquierda', 'centro', 'derecha'];
const ICONOS_TEXTO_LARGO = { cortar: 'more_horiz', desvanecer: 'gradient', desplazar: 'sync_alt' };
const ICONOS_ALINEACION = { izquierda: 'format_align_left', centro: 'format_align_center', derecha: 'format_align_right' };

/** Campos del overlay de musica: los de diseno fijo (con sus skins mas las propias) y los de la cancion. */
export const camposMusica = (camposFijos) => [
  ...camposFijos.flatMap((campo) => {
    if (campo.clave === 'skin') return { ...campo, opciones: [...campo.opciones, ...SKINS_MUSICA_PREMIUM], premium: [...campo.premium, ...SKINS_MUSICA_PREMIUM], presets: PRESETS_SKIN_MUSICA };
    // ponytail: en el default el overlay deja el color de la skin; elegir justo #ffffff equivale a "sin cambiar".
    if (campo.clave === 'fuente') return [campo, { clave: 'colorTexto', param: 'tc', tipo: 'color', def: '#ffffff', grupo: 'tipografia' }];
    return campo;
  }),
  // Multiplica el redondeo propio de cada skin (100% = el de la skin).
  { clave: 'redondeo', param: 'rad', tipo: 'numero', def: 1, min: 0, max: 2, step: 0.05, ui: 'rango', porcentaje: true, grupo: 'base' },
  { clave: 'ladoPortada', param: 'cover', tipo: 'opcion', def: 'izquierda', opciones: LADOS, opcionesTraducidas: LADOS, ui: 'botones', grupo: 'cancion' },
  { clave: 'textoLargo', param: 'long', tipo: 'opcion', def: 'desvanecer', opciones: TEXTO_LARGO, opcionesTraducidas: TEXTO_LARGO, ui: 'botones', iconos: ICONOS_TEXTO_LARGO, grupo: 'cancion' },
  { clave: 'mostrarEtiqueta', param: 'tag', tipo: 'bool', def: true, grupo: 'cancion' },
  { clave: 'mostrarPedido', param: 'req', tipo: 'bool', def: true, grupo: 'cancion' },
  { clave: 'avatarPedido', param: 'reqav', tipo: 'bool', def: true, grupo: 'cancion', dependeDe: 'mostrarPedido' },
  { clave: 'alineacionPedido', param: 'reqa', tipo: 'opcion', def: 'izquierda', opciones: ALINEACIONES, opcionesTraducidas: ALINEACIONES, ui: 'botones', iconos: ICONOS_ALINEACION, grupo: 'cancion', dependeDe: 'mostrarPedido' },
  { clave: 'mostrarBarra', param: 'bar', tipo: 'bool', def: true, grupo: 'cancion' },
  { clave: 'mostrarTiempos', param: 'time', tipo: 'bool', def: true, grupo: 'cancion' },
  // Video mudo del tema en lugar de la portada; apagado por defecto (pesa mucho mas que el audio).
  { clave: 'mostrarVideo', param: 'video', tipo: 'bool', def: false, grupo: 'cancion' },
  { clave: 'mostrarCola', param: 'next', tipo: 'bool', def: false, grupo: 'cancion' },
  ...camposAnimacion({ entrada: 'slide-up', salida: 'sale-fade' }),
];
