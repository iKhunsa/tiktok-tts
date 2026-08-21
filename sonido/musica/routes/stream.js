'use strict';

function stream(deps) {
  return async (req, res) => {
    const { engine, logger } = deps;
    const { videoId } = req.query;
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return res.status(400).json({ error: 'videoId inválido' });
    }

    res.setHeader('Cache-Control', 'no-store');
    try {
      await engine.ensureReady();
    } catch (_error) {
      return res.status(503).json({ error: 'Motor de música no disponible' });
    }

    res.setHeader('Content-Type', 'audio/webm');
    const child = engine.createStream(videoId);
    // end:false — si yt-dlp falla sin emitir bytes, el pipe no cierra la
    // respuesta con 200 vacio antes de poder responder 500.
    child.stdout.pipe(res, { end: false });

    let aborted = false;
    child.on('error', (err) => {
      logger.log(
        'warn', 'sonido', 'sonido/musica/routes/stream.js#stream', 'sonido.musica.stream_error',
        `Error de spawn en stream de musica: ${err.message}`, { videoId, error: err.message }
      );
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    child.on('close', (code) => {
      // Si el cliente aborto (skip/cierre), el kill produce exit != 0: no es error.
      if (code !== 0 && !aborted) {
        logger.log(
          'warn', 'sonido', 'sonido/musica/routes/stream.js#stream', 'sonido.musica.stream_error',
          `yt-dlp salio con codigo ${code} durante el stream`, { videoId, code, stderrTail: child.stderrTail() }
        );
        if (!res.headersSent) return res.status(500).end();
      }
      res.end();
    });
    res.on('close', () => {
      if (!res.writableEnded) aborted = true;
      try { child.kill(); } catch (_) { /* best-effort */ }
    });
  };
}

module.exports = { stream };
