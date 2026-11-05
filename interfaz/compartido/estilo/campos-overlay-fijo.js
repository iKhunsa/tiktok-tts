import { camposAlineacion, camposPosicion } from './campos-alineacion.js';
import { campoEscala, camposTipografia } from './campos-tipografia.js';
import { SKINS_CHAT, SKINS_PREMIUM } from './campos-chat.js';

// El tamano lo da el zoom y cada texto tiene su jerarquia propia: un solo tamano la romperia.
const SIN_TAMANO = ['tamano', 'interlineado'];

/**
 * Ajustes de los overlays de diseno fijo (tarjetas, alertas, contadores, listas).
 * `texto`: si tienen bloques de texto que alinear; los contadores van centrados por diseno.
 */
export const camposOverlayFijo = ({ texto }) => [
  // Mismas skins que el chat, aplicadas a la tarjeta (skins-tarjeta.css). Se eligen desde la vista previa.
  { clave: 'skin', param: 'skin', tipo: 'opcion', def: SKINS_CHAT[0], opciones: [...SKINS_CHAT, ...SKINS_PREMIUM], libres: SKINS_CHAT, premium: SKINS_PREMIUM, ui: 'oculto', grupo: 'skin' },
  campoEscala(),
  ...camposTipografia(14).filter(({ clave }) => !SIN_TAMANO.includes(clave)),
  ...(texto ? camposAlineacion({ posicionV: 'arriba' }) : camposPosicion({ posicionV: 'arriba' })),
];
