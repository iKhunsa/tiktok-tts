'use strict';

const { createChatGuard, createViewerRegistry } = require('@tiklivetts/chat-guard');

function preview(deps) {
  return (req, res) => {
    const text = typeof (req.body || {}).text === 'string' ? req.body.text : '';
    if (!text.trim()) return res.status(400).json({ error: 'text requerido' });
    const guard = createChatGuard({ registry: createViewerRegistry(), ...deps.guardOptions() });
    const verdict = guard.review({ platform: 'tiktok', raw: { uniqueId: 'preview', nickname: 'preview', comment: text } });
    res.json({ blocked: verdict.action === 'drop', stage: verdict.reasons[0] || 'none' });
  };
}

module.exports = { preview };
