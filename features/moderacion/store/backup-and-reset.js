'use strict';

const fs = require('fs');

function backupAndReset(state, suffix, reason) {
  try {
    fs.renameSync(state.filePath, `${state.filePath}.${suffix}`);
    state.logger.log(
      'error', 'moderacion', 'moderacion/store/backup-and-reset.js#backupAndReset', 'moderacion.store.apartado_por_corrupcion',
      `moderation.json apartado: ${reason}`, { reason, suffix, path: state.filePath }
    );
  } catch (error) {
    state.logger.log(
      'fatal', 'moderacion', 'moderacion/store/backup-and-reset.js#backupAndReset', 'moderacion.store.backup_fallido',
      `No se pudo apartar moderation.json (doble fallo: corrupto y ademas no se pudo respaldar): ${error.message}`,
      { path: state.filePath, error: error.message, stack: error.stack }
    );
  }
  state.viewers.clear();
}

module.exports = { backupAndReset };
