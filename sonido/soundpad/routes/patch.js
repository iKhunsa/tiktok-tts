'use strict';

const { loadSounds } = require('../load-sounds');
const { saveSounds } = require('../save-sounds');
const { syncSoundPadsToMobileState } = require('../sync-to-mobile-state');

function patch(deps) {
  return (req, res) => {
    const sounds = loadSounds(deps.soundsConfigPath);
    const idx = sounds.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Sonido no encontrado' });

    const { name, color, shortcut } = req.body || {};
    if (typeof name === 'string') sounds[idx].name = name.slice(0, 40);
    if (typeof color === 'string') sounds[idx].color = color;
    if (shortcut !== undefined) sounds[idx].shortcut = shortcut || null;

    saveSounds(deps.soundsConfigPath, sounds);
    syncSoundPadsToMobileState(deps);
    res.json(sounds[idx]);
  };
}

module.exports = { patch };
