'use strict';

const MOD_DURATION_MAX_MS = 365 * 24 * 60 * 60 * 1000;

/** Acepta { key } o { platform, userId, nick }. null si no hay forma de identificar al usuario. */
function resolveModTarget(store, body = {}) {
  if (typeof body.key === 'string' && store.parseKey(body.key)) {
    const parsed = store.parseKey(body.key);
    return { key: body.key, platform: parsed.platform, userId: body.userId || null, nick: body.nick || null };
  }
  const platform = ['tiktok', 'twitch', 'youtube', 'kick'].includes(body.platform) ? body.platform : null;
  if (!platform) return null;
  if (!body.userId && !body.nick) return null;
  return { platform, userId: body.userId || null, nick: body.nick || null };
}

/** null/omitido = indefinido (-1). Un numero = milisegundos desde ahora. */
function resolveUntil(durationMs) {
  if (durationMs === null || durationMs === undefined) return -1;
  const ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms <= 0 || ms > MOD_DURATION_MAX_MS) return null;
  return Date.now() + ms;
}

function isAdminIdentity(config, platform, ...candidates) {
  const list = config && config.adminIdentities && config.adminIdentities[platform];
  if (!Array.isArray(list) || !list.length) return false;
  const wanted = list.map((s) => String(s).trim().toLowerCase());
  return candidates.some((c) => c && wanted.includes(String(c).trim().toLowerCase()));
}

function isAdminTarget(config, target) {
  if (!target) return false;
  return isAdminIdentity(config, target.platform, target.userId, target.nick);
}

function applyModAction(deps, req, res, fn, { blockAdmin = false } = {}) {
  const { store, bus, logger } = deps;
  const target = resolveModTarget(store, req.body || {});
  if (!target) return res.status(400).json({ error: 'Se requiere key o platform + (userId|nick)' });

  if (blockAdmin) {
    let config = null;
    bus.emit('config:get', (c) => { config = c; });
    if (isAdminTarget(config, target)) {
      logger.log(
        'warn', 'moderacion', 'moderacion/apply-mod-action.js#applyModAction', 'moderacion.accion.target_admin_rechazado',
        `Intento de aplicar moderacion sobre identidad admin: ${target.nick || target.userId} (${target.platform})`,
        { platform: target.platform, userId: target.userId, nick: target.nick }
      );
      return res.status(403).json({ error: 'Este usuario es admin de la app; no se le puede aplicar moderacion' });
    }
  }

  const viewer = fn(target);
  store.flush();
  bus.emit('ws:broadcast', { type: 'moderation-updated', viewer });
  res.json({ ok: true, viewer });
}

module.exports = { resolveModTarget, resolveUntil, isAdminTarget, isAdminIdentity, applyModAction, MOD_DURATION_MAX_MS };
