'use strict';

const fs = require('fs');
const path = require('path');

// Cache local de la identidad de cada canal. Regla del proyecto: el perfil
// de un canal se resuelve como maximo DOS veces por canal; de ahi en
// adelante se reutiliza lo cacheado. Si la resolucion falla, el contador NO
// sube: un fallo de red transitorio no puede dejar al creador sin ficha
// para siempre.

const MAX_RESOLVES = 2;

class CreatorCache {
  constructor(dataDir, logger) {
    this.file = path.join(dataDir, 'telemetry-identity.json');
    this.data = { channels: {} };
    this.logger = logger;
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return;
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        this.data = { channels: parsed.channels || {} };
      }
    } catch (error) {
      this.data = { channels: {} };
      this.logger.log(
        'warn', 'telemetria', 'telemetria/creator-cache.js#load', 'telemetria.creator_cache.resolucion_fallida',
        `No se pudo cargar la cache de identidad de canales: ${error.message}`, { path: this.file, error: error.message }
      );
    }
  }

  persist() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      this.logger.log(
        'warn', 'telemetria', 'telemetria/creator-cache.js#persist', 'telemetria.creator_cache.resolucion_fallida',
        `No se pudo persistir la cache de identidad de canales: ${error.message}`, { path: this.file, error: error.message }
      );
    }
  }

  key(platform, username) {
    return `${platform}:${String(username).toLowerCase()}`;
  }

  entry(platform, username) {
    return this.data.channels[this.key(platform, username)] || { resolveCount: 0, cached: null };
  }

  shouldResolve(platform, username) {
    return this.entry(platform, username).resolveCount < MAX_RESOLVES;
  }

  recordResolved(platform, username, profile) {
    const k = this.key(platform, username);
    const prev = this.data.channels[k] || { resolveCount: 0 };
    this.data.channels[k] = {
      resolveCount: Math.min(MAX_RESOLVES, prev.resolveCount + 1),
      cached: profile || prev.cached || null,
    };
    this.persist();
    return this.data.channels[k].resolveCount;
  }

  forceReResolve(platform, username) {
    const k = this.key(platform, username);
    const prev = this.data.channels[k];
    if (!prev) return;
    prev.resolveCount = Math.max(0, MAX_RESOLVES - 1);
    this.persist();
  }
}

module.exports = { CreatorCache, MAX_RESOLVES };
