'use strict';

/**
 * Video mudo del tema para el overlay que lo muestra en lugar de la portada.
 * Solo sale de la cache: si aun no esta, responde 404 (el overlay sigue con
 * la portada y reintenta) y avisa que hay overlays con video, para que la
 * precarga baje el de este tema y los siguientes.
 */
function video(deps, precargar) {
  return (req, res) => {
    const { videoId } = req.query;
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return res.status(400).json({ error: 'videoId inválido' });
    }
    deps.musicState.videoWantedAt = Date.now();
    const enCache = deps.engine.cachedVideo(videoId);
    if (enCache) return res.sendFile(enCache.ruta, { headers: { 'Content-Type': enCache.tipo } });
    precargar();
    res.status(404).json({ pending: true });
  };
}

module.exports = { video };
