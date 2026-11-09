import { conectarWSOverlay } from './ws-cliente.js';
import { EVENTOS_ALERTA } from './eventos-alerta.js';
import { reproducirSonidoAlerta } from './sonido-alerta.js';
import { MUESTRA_ALERTA_SOCIAL, MUESTRA_REGALO } from './muestras-vista-previa.js';

/** Que eventos del WS muestra cada overlay de alertas, y su ejemplo para la vista previa. */
const ALERTAS = {
  alertas: { coincide: (d) => d.type === 'gift' || d.type === 'superchat', muestra: () => MUESTRA_REGALO },
  'alertas-social': { coincide: (d) => d.type === 'follow' || d.type === 'share', muestra: () => MUESTRA_ALERTA_SOCIAL },
  ...Object.fromEntries(Object.entries(EVENTOS_ALERTA).map(([id, alerta]) => [id, {
    coincide: alerta.coincide,
    maxPendientes: alerta.maxPendientes,
    // ?muestra= solo existe en el configurador: prueba otro nivel sin afectar a la URL de OBS.
    muestra: (params) => ({ ...alerta.muestra, ...(params.has('muestra') && alerta.muestras?.[Number(params.get('muestra'))]) }),
  }])),
};

/** Tope de alertas en espera del overlay (las entradas al directo llegan de a decenas). */
export const maxPendientesDe = (overlay) => ALERTAS[overlay]?.maxPendientes;

/**
 * Eventos crudos del WS para un overlay de alertas (alertas, alertas-social o uno de EVENTOS_ALERTA),
 * comun al overlay de la app y a los .epik. En la vista previa manda primero su ejemplo.
 * alAlerta(evento): un evento que le toca a este overlay. alConfig(config): cambio de ajustes de la app.
 * sonido: ajustes con el sonido de la alerta. La vista previa no reproduce las alertas (queda fija con su ejemplo), asi que
 * suena aqui cuando llega un evento de prueba (boton Probar / Probar escena); en OBS suena con la alerta real.
 */
export function iniciarFuenteAlerta(overlay, { params, vistaPrevia, alAlerta, alConfig, sonido }) {
  const alerta = ALERTAS[overlay];
  if (!alerta) return;
  if (vistaPrevia) alAlerta(alerta.muestra(params));
  conectarWSOverlay((d) => {
    if (d.type === 'config-updated') alConfig(d.config || {});
    else if (alerta.coincide(d)) {
      if (vistaPrevia && d.test && sonido) reproducirSonidoAlerta(sonido);
      alAlerta(d);
    }
  });
}
