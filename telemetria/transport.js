'use strict';

// Envio de batches al servidor de telemetria. Reglas de oro: nunca lanzar
// hacia arriba y nunca bloquear a la app. Si el servidor no responde, los
// eventos se quedan en la cola y se reintentan.

const BATCH_SIZE = 50;
const RETRY_DELAYS = [1000, 4000, 15000];

class Transport {
  constructor({ url, token, buffer, identity, appVersion, onDirectives, logger }) {
    this.url = url;
    this.token = token;
    this.buffer = buffer;
    this.identity = identity;
    this.appVersion = appVersion;
    this.onDirectives = onDirectives || (() => {});
    this.logger = logger;
    this.sending = false;
  }

  async flush({ timeoutMs = 10000, retries = RETRY_DELAYS.length } = {}) {
    if (this.sending || !this.buffer.size) return true;
    this.sending = true;
    const deadline = Date.now() + timeoutMs;

    try {
      while (this.buffer.size && Date.now() < deadline) {
        const events = this.buffer.take(BATCH_SIZE);
        const sent = await this.send(events, deadline, retries);
        if (!sent) return false;
        this.buffer.drop(events.length);
      }
      return true;
    } finally {
      this.sending = false;
    }
  }

  async send(events, deadline, retries) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return false;

      try {
        const res = await fetch(this.url, {
          method: 'POST',
          headers: this.token
            ? { 'Content-Type': 'application/json', 'X-Ingest-Token': this.token }
            : { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema: 2,
            machine_id: this.identity.machineId,
            session_id: this.identity.sessionId,
            app_version: this.appVersion,
            os: this.identity.os,
            events,
          }),
          signal: AbortSignal.timeout(Math.min(remaining, 8000)),
        });

        // 4xx = el servidor rechaza este payload — fixea el punto mas ciego
        // de la auditoria: antes esto se trataba como exito silencioso.
        if (res.status >= 400 && res.status < 500) {
          const bodyPreview = await res.text().then((t) => t.slice(0, 300)).catch(() => '');
          this.logger.log(
            'warn', 'telemetria', 'telemetria/transport.js#send', 'telemetria.envio.rechazado',
            `Servidor de telemetria rechazo el batch: HTTP ${res.status}`, { statusHttp: res.status, bodyPreview }
          );
          return true; // consumido: reintentarlo no lo arregla
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        try {
          const body = await res.json();
          if (body && body.directives) this.onDirectives(body.directives);
        } catch (_) { /* respuesta sin cuerpo util */ }

        this.logger.log(
          'debug', 'telemetria', 'telemetria/transport.js#send', 'telemetria.envio.exitoso',
          `Batch de telemetria enviado (${events.length} evento(s))`, { count: events.length }
        );
        return true;
      } catch (error) {
        this.logger.log(
          'warn', 'telemetria', 'telemetria/transport.js#send', 'telemetria.envio.fallido',
          `Intento ${attempt + 1}/${retries + 1} de envio de telemetria fallo: ${error.message}`,
          { intentoNumero: attempt + 1, retriesTotal: retries + 1, error: error.message, stack: error.stack }
        );
        if (attempt === retries) return false;
        const wait = Math.min(RETRY_DELAYS[attempt], Math.max(0, deadline - Date.now()));
        if (wait <= 0) return false;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    return false;
  }
}

module.exports = { Transport, BATCH_SIZE };
