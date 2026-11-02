'use strict';

const multer = require('multer');
const { getOverlayIdeasWebhookUrl } = require('../webhook-url');
const { postIdeasWebhook } = require('../discord/post-webhook');
const { isRateLimited, markSent, trimText, truncateEmbed } = require('./report-idea');

const APP_VERSION = require('../../../package.json').version;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, done) => done(IMAGE_EXTENSIONS[file.mimetype] ? null : new Error('Tipo de imagen no permitido'), Boolean(IMAGE_EXTENSIONS[file.mimetype])),
}).single('imagen');

function validateOverlayIdea(body) {
  const idea = {
    idea: trimText(body?.idea), referencia: trimText(body?.referencia, 500),
    discord: trimText(body?.discord, 40), email: trimText(body?.email, 254),
  };
  if (!idea.idea || (!idea.discord && !idea.email)) return { errorKey: 'errors.overlayIdeaRequired' };
  return { value: idea };
}

function buildOverlayEmbed(idea, { appVersion = 'unknown', language = 'es', imageName } = {}) {
  const fields = [['Idea', idea.idea]];
  if (idea.referencia) fields.push(['Referencia', idea.referencia]);
  if (idea.discord) fields.push(['Discord', idea.discord]);
  if (idea.email) fields.push(['Email', idea.email]);
  return {
    title: 'Nueva idea de overlay', color: 16766720,
    fields: fields.map(([name, value]) => ({ name, value: truncateEmbed(value) })),
    ...(imageName ? { image: { url: `attachment://${imageName}` } } : {}),
    footer: { text: truncateEmbed(`TikLiveTTS v${appVersion} · UI: ${language}`, 2048) }, timestamp: new Date().toISOString(),
  };
}

function reportOverlayIdea(logger, bus, deps = {}) {
  const now = deps.now || Date.now;
  const getWebhookUrl = deps.getWebhookUrl || getOverlayIdeasWebhookUrl;
  const postWebhook = deps.postWebhook || postIdeasWebhook;
  return (req, res) => upload(req, res, async (uploadError) => {
    if (uploadError) return res.status(400).json({ error: 'Imagen inválida', errorKey: 'errors.overlayIdeaImage' });
    const checked = validateOverlayIdea(req.body);
    if (checked.errorKey) return res.status(400).json({ error: 'Datos de la idea inválidos', errorKey: checked.errorKey });
    const current = now();
    if (isRateLimited(current)) return res.status(429).json({ error: 'Esperá antes de enviar otra sugerencia', errorKey: 'errors.ideasRateLimited' });
    const webhookUrl = getWebhookUrl(logger);
    if (!webhookUrl) return res.status(503).json({ error: 'Sugerencias no disponibles temporalmente', errorKey: 'errors.ideasUnavailable' });
    const version = trimText(req.body?.appVersion, 30) || APP_VERSION;
    const language = trimText(req.body?.language, 12) || 'es';
    // Nombre fijo: el del archivo del usuario puede traer su ruta o su nombre real.
    const file = req.file && { name: `referencia.${IMAGE_EXTENSIONS[req.file.mimetype]}`, type: req.file.mimetype, buffer: req.file.buffer };
    try {
      const embed = buildOverlayEmbed(checked.value, { appVersion: version, language, imageName: file?.name });
      await postWebhook(webhookUrl, embed, { threadName: `Overlay: ${checked.value.idea}`.replace(/\s+/g, ' ').slice(0, 100), file });
      markSent(current);
      logger.log('info', 'sugerencias', 'sugerencias/routes/report-overlay-idea.js#reportOverlayIdea', 'ideas.overlay_enviada', 'Idea de overlay enviada a Discord', { version, language, conImagen: Boolean(file) });
      if (bus) bus.emit('ideas:enviada');
      return res.json({ ok: true });
    } catch (error) {
      logger.log('warn', 'sugerencias', 'sugerencias/routes/report-overlay-idea.js#reportOverlayIdea', 'ideas.overlay_fallo', `No se pudo enviar la idea de overlay: ${error.message}`, { error: error.message });
      return res.status(502).json({ error: 'No se pudo enviar la sugerencia', errorKey: 'errors.ideasSendFailed' });
    }
  });
}

module.exports = { buildOverlayEmbed, reportOverlayIdea, validateOverlayIdea };
