'use strict';

const { moderationStage } = require('../filters/moderation-stage');

// Duplicado intencional de la normalizacion de /chat (Fase 7) — dominios no
// importan modulos internos de otros dominios.
function normalizeForModeration(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Prueba de moderacion sin efectos secundarios: mismos filtros que el chat real, sin tocar duplicados ni disparar TTS. */
function preview(deps) {
  return (req, res) => {
    const text = typeof (req.body || {}).text === 'string' ? req.body.text : '';
    if (!text.trim()) return res.status(400).json({ error: 'text requerido' });

    let config = null;
    deps.bus.emit('config:get', (c) => { config = c; });
    const idiomaOpts = {
      voiceId: config && config.ttsVoiceLang,
      langFilterEnabled: !!(config && config.langFilterEnabled),
      dictFilterEnabled: !!(config && config.dictFilterEnabled),
      allowedExtraLangs: (config && config.allowedExtraLangs) || [],
    };

    const result = moderationStage(normalizeForModeration(text), deps.blockedMatchersState, idiomaOpts);
    if (!result) return res.json({ blocked: false, stage: 'none' });
    res.json({ blocked: true, ...result });
  };
}

module.exports = { preview };
