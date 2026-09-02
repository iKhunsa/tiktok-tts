'use strict';

function markClip(deps, origen) {
  const { bus, logger } = deps;
  logger.log(
    'info', 'clips', 'clips/mark-clip.js#markClip', 'clips.marcado.solicitado',
    `Clip solicitado (origen: ${origen})`, { origen }
  );
  bus.emit('clips:marcar', { origen });
}

module.exports = { markClip };
