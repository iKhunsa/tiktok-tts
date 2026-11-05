'use strict';

// El <audio> vive en la ventana de la app; el overlay de OBS no lo ve. La app
// avisa aqui en cada play/pausa/salto y el overlay interpola entre avisos.
function currentProgress(musicState) {
  const p = musicState.progress;
  if (!p || p.videoId !== musicState.currentTrack?.videoId) return null;
  const position = p.paused ? p.position : p.position + (Date.now() - p.at) / 1000;
  return { videoId: p.videoId, position, duration: p.duration, paused: p.paused };
}

function progress(deps) {
  return (req, res) => {
    const { videoId, position, duration, paused } = req.body || {};
    if (typeof videoId !== 'string' || !Number.isFinite(position)) return res.status(400).json({ ok: false });
    deps.musicState.progress = { videoId, position, duration: Number.isFinite(duration) ? duration : 0, paused: !!paused, at: Date.now() };
    const actual = currentProgress(deps.musicState);
    if (actual) deps.bus.emit('ws:broadcast', { type: 'music-progress', ...actual });
    res.json({ ok: true });
  };
}

module.exports = { progress, currentProgress };
