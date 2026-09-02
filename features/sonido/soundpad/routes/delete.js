'use strict';

const fs = require('fs');
const path = require('path');
const { loadSounds } = require('../load-sounds');
const { saveSounds } = require('../save-sounds');
const { syncSoundPadsToMobileState } = require('../sync-to-mobile-state');

function del(deps) {
  return (req, res) => {
    const sounds = loadSounds(deps.soundsConfigPath);
    const idx = sounds.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Sonido no encontrado' });

    const [removed] = sounds.splice(idx, 1);
    try {
      fs.unlinkSync(path.join(deps.soundsDir, removed.filename));
    } catch (error) {
      deps.logger.log(
        'warn', 'sonido', 'sonido/soundpad/routes/delete.js#del', 'sonido.soundpad.borrado_archivo_fallido',
        `No se pudo borrar el archivo de audio ${removed.filename}: ${error.message}`, { filename: removed.filename, error: error.message }
      );
    }
    saveSounds(deps.soundsConfigPath, sounds);
    syncSoundPadsToMobileState(deps);
    res.json({ ok: true });
  };
}

module.exports = { del };
