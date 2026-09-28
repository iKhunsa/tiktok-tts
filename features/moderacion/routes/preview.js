'use strict';

const { createChatGuard, createViewerRegistry } = require('@tiklivetts/chat-guard');

function preview(deps) {
  return (req, res) => {
    const text = typeof (req.body || {}).text === 'string' ? req.body.text : '';
    if (!text.trim()) return res.status(400).json({ error: 'text requerido' });
    let config = {};
    deps.bus.emit('config:get', (c) => { config = c || {}; });
    const guard = createChatGuard({ registry: createViewerRegistry(), blockedWords: [...deps.blockedMatchersState.blockedWords], rules: { maxDisplayLength: 300, maxSpeechLength: config.TTS_MAX_CHARS || 500, floodWindowMs: 45000, floodMinLength: 4, duplicateWindowMs: 6 * 60 * 60 * 1000, nonFollowersSpeak: !!config.ttsReadNonFollowers } });
    const verdict = guard.review({ platform: 'tiktok', raw: { uniqueId: 'preview', nickname: 'preview', comment: text } });
    res.json({ blocked: verdict.action === 'drop', stage: verdict.reasons[0] || 'none' });
  };
}

module.exports = { preview };
