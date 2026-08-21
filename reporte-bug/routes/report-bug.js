'use strict';

const os = require('os');
const { getBugReportWebhookUrl } = require('../webhook-url');
const { postToDiscordWebhook } = require('../discord/post-webhook');

const BUG_REPORT_COOLDOWN_MS = 10000;
let lastBugReportAt = 0;

// Fallback solo para dev/browser sin Electron. En produccion la version
// siempre viene del cliente via IPC, no de este package.json leido por el server.
let fallbackAppVersion = 'unknown';
try { fallbackAppVersion = require('../../package.json').version; } catch (_) { /* usa 'unknown' */ }

/** Migracion de POST /api/report-bug (backend-viejo/server.js:2093). */
function reportBug(logger) {
  return async (req, res) => {
    const { discordNick, channelLink, description, extra, appVersion: clientAppVersion } = req.body || {};
    if (!discordNick || !channelLink || !description) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const appVersion = (typeof clientAppVersion === 'string' && clientAppVersion.trim())
      ? clientAppVersion.trim().slice(0, 30)
      : fallbackAppVersion;

    const now = Date.now();
    if (now - lastBugReportAt < BUG_REPORT_COOLDOWN_MS) {
      return res.status(429).json({ error: 'Espera unos segundos antes de enviar otro reporte' });
    }

    const webhookUrl = getBugReportWebhookUrl(logger);
    if (!webhookUrl) {
      return res.status(503).json({ error: 'Reporte de bug no disponible temporalmente' });
    }

    const embed = {
      title: '🐛 Nuevo reporte de bug',
      color: 15158332,
      fields: [
        { name: 'Discord', value: String(discordNick).slice(0, 200), inline: true },
        { name: 'Canal', value: String(channelLink).slice(0, 300), inline: true },
        { name: 'Version app', value: appVersion, inline: true },
        { name: 'SO', value: `${os.platform()} ${os.release()}`, inline: true },
        { name: 'Que paso', value: String(description).slice(0, 1000) },
      ],
      footer: { text: 'TikTok TTS — Reporte de bug' },
      timestamp: new Date().toISOString(),
    };
    if (extra) embed.fields.push({ name: 'Info adicional', value: String(extra).slice(0, 1000) });

    lastBugReportAt = now;

    try {
      const result = await postToDiscordWebhook(logger, webhookUrl, embed, logger.getSessionLogPath());
      res.json({ ok: true, attached: result.attached });
    } catch (_error) {
      res.status(502).json({ error: 'No se pudo enviar el reporte' });
    }
  };
}

module.exports = { reportBug };
