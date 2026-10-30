import { camposAlineacion } from './campos-alineacion.js';
import { campoEscala, camposTipografia } from './campos-tipografia.js';
import { EFECTOS_TEXTO } from './fuentes.js';

const ANIMACIONES_ENTRADA = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'fade', 'pop', 'zoom', 'blur', 'flip', 'reveal', 'reveal-up', 'reveal-center', 'bounce', 'drop', 'swing', 'skew', 'elastic', 'shake', 'glitch', 'ninguna'];
const ANIMACIONES_SALIDA = ['sale-fade', 'sale-arriba', 'sale-abajo', 'sale-izquierda', 'sale-derecha', 'sale-encoge', 'sale-crece', 'sale-blur', 'sale-flip', 'sale-recorte', 'sale-recorte-arriba', 'sale-recorte-centro', 'sale-rebote', 'sale-caida', 'sale-balanceo', 'sale-inclinado', 'sale-elastico', 'sale-sacudida', 'sale-glitch', 'ninguna'];
const PLATAFORMAS_VISIBLES = { tiktok: true, twitch: true, youtube: true, kick: true };
export const SKINS_CHAT = ['clasica', 'cristal', 'neon', 'minimal', 'bloque'];
/** Estilos de la seccion Explorar, incluidos en Pro. */
export const SKINS_PREMIUM = ['burbuja', 'terminal', 'retro', 'degradado'];
export const MAX_FAVORITAS = 5;

/** Lista con la skin puesta o quitada; null si ya no caben mas favoritas. */
export function alternarFavorita(lista, skin) {
  if (lista.includes(skin)) return lista.filter((otra) => otra !== skin);
  return lista.length < MAX_FAVORITAS ? [...lista, skin] : null;
}

// Un rol (viewer / moderador / suscriptor) se personaliza con los mismos 7
// campos; solo cambian el prefijo de clave/param y el color de partida.
const camposRol = (rol, prefijoParam, colorUsuario) => [
  { clave: `${rol}Mostrar`, param: `${prefijoParam}_show`, tipo: 'bool', def: true, etiqueta: 'rolMostrar', grupo: rol },
  { clave: `${rol}ColorUsuario`, param: `${prefijoParam}_c`, tipo: 'color', def: colorUsuario, etiqueta: 'rolColorUsuario', grupo: rol },
  { clave: `${rol}Efecto`, param: `${prefijoParam}_fx`, tipo: 'opcion', def: EFECTOS_TEXTO[0], opciones: EFECTOS_TEXTO, opcionesTraducidas: EFECTOS_TEXTO, etiqueta: 'rolEfecto', grupo: rol },
  { clave: `${rol}Ola`, param: `${prefijoParam}_wave`, tipo: 'bool', def: false, etiqueta: 'rolOla', grupo: rol },
  { clave: `${rol}Resplandor`, param: `${prefijoParam}_glow`, tipo: 'bool', def: false, etiqueta: 'rolResplandor', grupo: rol },
  { clave: `${rol}ColorComentario`, param: `${prefijoParam}_t`, tipo: 'color', def: '#e8e8e8', etiqueta: 'rolColorComentario', grupo: rol },
  { clave: `${rol}ColorFondo`, param: `${prefijoParam}_bg`, tipo: 'color', def: '#080808', etiqueta: 'rolColorFondo', grupo: rol },
];

export const camposChat = () => [
  // La skin solo cambia la forma del mensaje (los colores siguen siendo los elegidos). Se elige desde la vista previa.
  { clave: 'skin', param: 'skin', tipo: 'opcion', def: SKINS_CHAT[0], opciones: [...SKINS_CHAT, ...SKINS_PREMIUM], ui: 'oculto', grupo: 'skin' },
  // General: primero qué se muestra, después cómo se ve.
  { clave: 'usernames', param: 'usernames', tipo: 'bool', def: true, etiqueta: 'mostrarNombres', grupo: 'base' },
  { clave: 'mostrarAvatares', param: 'av', tipo: 'bool', def: true, grupo: 'base' },
  { clave: 'platforms', param: 'platforms', tipo: 'plataformas', def: PLATAFORMAS_VISIBLES, etiqueta: 'plataformasVisibles', grupo: 'base' },
  { clave: 'maxmsgs', param: 'maxmsgs', tipo: 'numero', def: 30, min: 5, max: 80, step: 1, etiqueta: 'mensajesVisibles', grupo: 'base' },
  campoEscala(),
  { clave: 'anchoMensajes', param: 'mw', tipo: 'numero', def: 1, min: 0.3, max: 3.05, step: 0.05, ui: 'rango', porcentaje: true, grupo: 'base' },
  { clave: 'bg', param: 'bg', tipo: 'numero', def: 0.82, min: 0, max: 1, step: 0.05, ui: 'rango', porcentaje: true, etiqueta: 'opacidadFondo', grupo: 'base' },
  ...camposTipografia(14),
  ...camposAlineacion({ posicionV: 'abajo' }),
  { clave: 'ajustarAncho', param: 'fit', tipo: 'bool', def: false, grupo: 'alineacion' },
  { clave: 'derechaAIzquierda', param: 'rtl', tipo: 'bool', def: false, grupo: 'alineacion', espeja: ['alineacionTexto', 'posicionH'] },
  { clave: 'animacionEntrada', param: 'anim', tipo: 'opcion', def: ANIMACIONES_ENTRADA[0], opciones: ANIMACIONES_ENTRADA, opcionesTraducidas: ANIMACIONES_ENTRADA, grupo: 'animacion' },
  { clave: 'duracionEntrada', param: 'animd', tipo: 'numero', def: 300, min: 100, max: 2000, step: 50, ui: 'rango', grupo: 'animacion' },
  { clave: 'animacionSalida', param: 'out', tipo: 'opcion', def: ANIMACIONES_SALIDA[0], opciones: ANIMACIONES_SALIDA, opcionesTraducidas: ANIMACIONES_SALIDA, grupo: 'animacion' },
  { clave: 'duracionSalida', param: 'outd', tipo: 'numero', def: 300, min: 100, max: 2000, step: 50, ui: 'rango', grupo: 'animacion' },
  { clave: 'ocultarTras', param: 'hide', tipo: 'numero', def: 0, min: 0, max: 300, step: 5, grupo: 'comportamiento' },
  { clave: 'unaLinea', param: 'single', tipo: 'bool', def: false, grupo: 'comportamiento' },
  { clave: 'colorAleatorio', param: 'rnd', tipo: 'bool', def: false, grupo: 'comportamiento' },
  ...camposRol('viewer', 'v', '#ffffff'),
  ...camposRol('moderador', 'm', '#6ee7a8'),
  ...camposRol('suscriptor', 's', '#f5c451'),
];
