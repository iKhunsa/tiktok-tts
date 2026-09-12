'use strict';

const { loadSounds } = require('../load-sounds');
const { saveSounds } = require('../save-sounds');
const { syncSoundPadsToMobileState } = require('../sync-to-mobile-state');

// El color termina interpolado en atributos style por los dos clientes. Solo
// se acepta la forma que producen el input type=color y los presets de UI.
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function patch(deps) {
  return (req, res) => {
    const sounds = loadSounds(deps.soundsConfigPath, deps.logger);
    const idx = sounds.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Sonido no encontrado' });

    const { name, color, shortcut, icon } = req.body || {};
    if (color !== undefined && (typeof color !== 'string' || !HEX_COLOR.test(color))) {
      return res.status(400).json({ error: 'Color inválido' });
    }
    if (typeof name === 'string') sounds[idx].name = name.slice(0, 40);
    if (typeof color === 'string') sounds[idx].color = color.toLowerCase();
    if (shortcut !== undefined) sounds[idx].shortcut = shortcut || null;
    if (typeof icon === 'string' && /^[a-z0-9_]{1,64}$/.test(icon)) sounds[idx].icon = icon;

    saveSounds(deps.soundsConfigPath, sounds, deps.logger);
    syncSoundPadsToMobileState(deps);
    res.json(sounds[idx]);
  };
}

module.exports = { patch, HEX_COLOR };
