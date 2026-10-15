import { camposTipografia } from './campos-tipografia.js';
import { EFECTOS_TEXTO } from './fuentes.js';

const ANIMACIONES_ENTRADA = ['slide-up', 'slide-left', 'fade', 'ninguna'];
const PLATAFORMAS_VISIBLES = { tiktok: true, twitch: true, youtube: true, kick: true };

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
  { clave: 'bg', param: 'bg', tipo: 'numero', def: 0.82, min: 0, max: 1, step: 0.05, ui: 'rango', porcentaje: true, etiqueta: 'opacidadFondo', grupo: 'base' },
  { clave: 'maxmsgs', param: 'maxmsgs', tipo: 'numero', def: 30, min: 5, max: 80, step: 1, etiqueta: 'mensajesVisibles', grupo: 'base' },
  { clave: 'usernames', param: 'usernames', tipo: 'bool', def: true, etiqueta: 'mostrarNombres', grupo: 'base' },
  { clave: 'platforms', param: 'platforms', tipo: 'plataformas', def: PLATAFORMAS_VISIBLES, etiqueta: 'plataformasVisibles', grupo: 'base' },
  ...camposTipografia(14),
  { clave: 'ocultarTras', param: 'hide', tipo: 'numero', def: 0, min: 0, max: 300, step: 5, grupo: 'comportamiento' },
  { clave: 'animacionEntrada', param: 'anim', tipo: 'opcion', def: ANIMACIONES_ENTRADA[0], opciones: ANIMACIONES_ENTRADA, opcionesTraducidas: ANIMACIONES_ENTRADA, grupo: 'comportamiento' },
  { clave: 'mostrarAvatares', param: 'av', tipo: 'bool', def: true, grupo: 'comportamiento' },
  { clave: 'unaLinea', param: 'single', tipo: 'bool', def: false, grupo: 'comportamiento' },
  { clave: 'ajustarAncho', param: 'fit', tipo: 'bool', def: false, grupo: 'comportamiento' },
  { clave: 'derechaAIzquierda', param: 'rtl', tipo: 'bool', def: false, grupo: 'comportamiento' },
  { clave: 'colorAleatorio', param: 'rnd', tipo: 'bool', def: false, grupo: 'comportamiento' },
  ...camposRol('viewer', 'v', '#ffffff'),
  ...camposRol('moderador', 'm', '#6ee7a8'),
  ...camposRol('suscriptor', 's', '#f5c451'),
];
