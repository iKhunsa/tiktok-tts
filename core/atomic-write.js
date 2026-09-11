'use strict';

const fs = require('fs');

/**
 * Escritura atomica: escribe a un .tmp y renombra sobre el archivo final.
 * Un crash a mitad de escritura deja el .tmp corrupto, nunca el archivo real.
 * Mismo patron ya usado en features/moderacion/store/flush.js.
 */
function atomicWriteFileSync(filePath, contents) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, contents, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

module.exports = { atomicWriteFileSync };
