'use strict';

const fs = require('fs');
const path = require('path');

// Cache local de la identidad de cada canal.
//
// La regla del proyecto: el perfil de un canal (avatar, nombre, seguidores) se
// resuelve como maximo DOS veces, contadas por canal:
//
//   1a - la primera vez que se conecta ese canal tras instalar la app
//   2a - la siguiente sesion en que se vuelve a conectar (corrige cambios de
//        @ o de avatar)
//   3a en adelante - cero llamadas: se reutiliza lo cacheado
//
// Si la resolucion falla, el contador NO sube: un fallo de red transitorio no
// puede dejar al creador sin ficha para siempre.

const MAX_RESOLVES = 2;

class CreatorCache {
  constructor(dataDir) {
    this.file = path.join(dataDir, 'telemetry-identity.json');
    this.data = { channels: {} };
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return;
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        this.data = { channels: parsed.channels || {} };
      }
    } catch (_) {
      this.data = { channels: {} };
    }
  }

  persist() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (_) { /* la telemetria nunca rompe la app */ }
  }

  key(platform, username) {
    return `${platform}:${String(username).toLowerCase()}`;
  }

  entry(platform, username) {
    return this.data.channels[this.key(platform, username)] || { resolveCount: 0, cached: null };
  }

  // ¿Toca gastar una resolucion en este canal?
  shouldResolve(platform, username) {
    return this.entry(platform, username).resolveCount < MAX_RESOLVES;
  }

  // Se llama SOLO cuando la resolucion ha ido bien.
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

  // El panel puede pedir un refresco puntual de un canal concreto.
  forceReResolve(platform, username) {
    const k = this.key(platform, username);
    const prev = this.data.channels[k];
    if (!prev) return;
    prev.resolveCount = Math.max(0, MAX_RESOLVES - 1); // deja exactamente una
    this.persist();
  }
}

module.exports = { CreatorCache, MAX_RESOLVES };
