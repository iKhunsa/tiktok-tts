'use strict';

const fs = require('fs');

/**
 * Lee solo la cola del archivo (ultimos maxBytes) sin cargar el resto en
 * memoria.
 */
async function readFileTail(filePath, maxBytes) {
  const stat = await fs.promises.stat(filePath);
  const start = Math.max(0, stat.size - maxBytes);
  const length = stat.size - start;
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(length);
    if (length > 0) await fh.read(buf, 0, length, start);
    return buf;
  } finally {
    await fh.close();
  }
}

module.exports = { readFileTail };
