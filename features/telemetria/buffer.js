'use strict';

const fs = require('fs');
const path = require('path');

// Cola de eventos con respaldo en disco. Si el servidor de telemetria esta
// caido, los eventos no se pierden: quedan en un archivo del directorio de
// datos y se reenvian en el siguiente arranque. Acotada para que un servidor
// caido durante semanas no engorde el disco del usuario.

const MAX_QUEUED = 500;

class Buffer {
  constructor(dataDir, logger) {
    this.file = path.join(dataDir, 'telemetry-queue.json');
    this.items = [];
    this.logger = logger;
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return;
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (Array.isArray(parsed)) this.items = parsed.slice(-MAX_QUEUED);
    } catch (error) {
      // Archivo corrupto: se descarta. La telemetria nunca debe romper la app.
      this.items = [];
      this.logger.log(
        'warn', 'telemetria', 'telemetria/buffer.js#load', 'telemetria.buffer.corrupto',
        `Cola de telemetria corrupta, se descarta: ${error.message}`, { path: this.file, error: error.message }
      );
    }
  }

  persist() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.items), 'utf8');
    } catch (error) {
      this.logger.log(
        'warn', 'telemetria', 'telemetria/buffer.js#persist', 'telemetria.buffer.persistencia_fallida',
        `No se pudo persistir la cola de telemetria: ${error.message}`, { path: this.file, error: error.message }
      );
    }
  }

  push(item) {
    this.items.push(item);
    // Al desbordar se tiran los MAS VIEJOS: lo reciente describe mejor el
    // estado actual del usuario.
    if (this.items.length > MAX_QUEUED) this.items = this.items.slice(-MAX_QUEUED);
  }

  take(n) {
    return this.items.slice(0, n);
  }

  drop(n) {
    this.items = this.items.slice(n);
    this.persist();
  }

  get size() {
    return this.items.length;
  }
}

module.exports = { Buffer, MAX_QUEUED };
