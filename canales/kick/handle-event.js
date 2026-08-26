'use strict';

const SEEN_IDS_CAP = 500;

/**
 * Dedup por id contra state.kickSeenIds antes de dejar pasar el mensaje a
 * canal:mensaje-crudo — la ventana oculta puede reenviar el mismo nodo del
 * DOM si el MutationObserver dispara mas de una vez, o tras una reconexion
 * interna de corard.tv.
 */
function handleKickWindowMessage(deps, slug, payload) {
  const { state, bus } = deps;
  if (!payload || !payload.id) return;

  if (!state.kickSeenIds.has(slug)) state.kickSeenIds.set(slug, new Set());
  const seen = state.kickSeenIds.get(slug);
  if (seen.has(payload.id)) return;
  seen.add(payload.id);
  if (seen.size > SEEN_IDS_CAP) seen.delete(seen.values().next().value);

  bus.emit('canal:mensaje-crudo', { platform: 'kick', channel: slug, raw: payload });
}

module.exports = { handleKickWindowMessage, SEEN_IDS_CAP };
