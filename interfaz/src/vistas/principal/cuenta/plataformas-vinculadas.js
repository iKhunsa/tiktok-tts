/**
 * Twitch/Kick vinculados a la cuenta (ver docs/plan-twitch-kick.md, FASE 1 y
 * FASE 4). Funciones puras, sin UI todavia — listas para que la pantalla de
 * perfil las use cuando se arme esa parte.
 *
 * El canal en tiempo real (FASE 3) no tiene funciones acá: vive del lado del
 * server embebido (features/auth/plataformas-realtime.js) y llega al
 * renderer por el WS local de siempre, como cualquier otro evento de la app.
 */
import { pedir } from './api.js';
import { autenticarConTwitchUI, autenticarConKickUI } from './plataforma-auth-cliente.js';

const DISPARAR_AUTH = { twitch: autenticarConTwitchUI, kick: autenticarConKickUI };

/** [{ plataforma, username, linkedAt }] — [] si el pedido falla. */
export async function listarPlataformasVinculadas() {
  const r = await pedir('/api/account/platforms');
  if (!r.ok) return [];
  return Array.isArray(r.body) ? r.body : (r.body.platforms || []);
}

/**
 * Dispara el baile OAuth (puerto fijo + PKCE para Kick) y vincula.
 * plataforma: 'twitch' | 'kick'. Devuelve {ok:true, body} o
 * {ok:false, body?} (motivo ya viene en body.errorKey: errors.plataformaTomada
 * / errors.invalidPlatformToken / errors.notImplemented).
 */
export async function vincularPlataforma(plataforma) {
  const disparar = DISPARAR_AUTH[plataforma];
  if (!disparar) return { ok: false };
  const datos = await disparar();
  if (!datos) return { ok: false }; // cancelado o fallo del baile OAuth, ya mostro su toast
  return pedir(`/api/account/link/${plataforma}`, { method: 'POST', body: datos });
}

export async function desvincularPlataforma(plataforma) {
  return pedir(`/api/account/link/${plataforma}`, { method: 'DELETE' });
}

/**
 * {ok:false} con errorKey errors.plataformaNoVinculada / plataformaDesconectada
 * (409) o errors.chatEnvioFallido (502, puede ser mensaje muy largo).
 */
export async function enviarMensajeChat(plataforma, mensaje) {
  return pedir(`/api/platforms/${plataforma}/chat`, { method: 'POST', body: { mensaje } });
}
