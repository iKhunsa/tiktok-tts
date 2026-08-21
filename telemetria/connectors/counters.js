'use strict';

// Eventos de alta frecuencia: TTS, musica, moderacion. No se manda uno por
// mensaje — se acumulan en contadores y se vuelcan en cada latido (5 min).
//
// El backend viejo escuchaba nombres de evento propios del bus de telemetria
// (tts:spoken, music:request, etc.) que server.js emitia a mano en cada
// call-site. En el rebuild, cada dominio ya loguea su propio evento de
// negocio (sonido.tts.hablado, moderacion.filtro.mensaje_bloqueado, etc.)
// via core/logger.js, que ahora espeja TODO log al bus como 'log:entry'
// (Fase 12). Este conector escucha ESE espejo y filtra por nombre de evento
// en vez de pedirle a cada dominio anterior que emita ademas un evento de
// telemetria dedicado.
//
// tts:skipped / tts:queue-overflow siguen llegando literal desde el
// renderer via IPC (electron-shell/ipc-bridge.js, misma lista blanca que el
// backend viejo) — no pasan por core/logger.js porque nacen en el cliente.
//
// Reduccion documentada respecto al backend viejo: soundpad:triggered,
// music:skip, music:playlist-play, moderation:user-muted/banned y
// tts-skipped-nonfollower no tienen un log de negocio equivalente todavia
// en las fases ya construidas — quedan fuera de este conector hasta que se
// agregue el log correspondiente en su dominio.
const LOG_ENTRY_COUNTED = [
  // [event de core/logger.js,                  conector,     nombre]
  ['sonido.tts.hablado', 'tts', 'spoken'],
  ['sonido.tts.rate_limitado', 'tts', 'rate_limited'],
  ['sonido.musica.solicitud_recibida', 'music', 'request'],
  ['moderacion.filtro.mensaje_bloqueado', 'moderation', 'message_filtered'],
  ['moderacion.filtro.palabra_bloqueada', 'moderation', 'word_blocked'],
];

const BUS_COUNTED = [
  ['tts:skipped', 'tts', 'skipped'],
  ['tts:queue-overflow', 'tts', 'queue_overflow'],
];

function attach(bus, track) {
  // clave "conector.nombre" -> { count, props }
  const counters = new Map();

  const bump = (connector, name, props) => {
    const key = `${connector}.${name}`;
    const entry = counters.get(key) || { connector, name, count: 0, props: {} };
    entry.count++;
    if (props && typeof props === 'object') Object.assign(entry.props, props);
    counters.set(key, entry);
  };

  bus.on('log:entry', (logEntry) => {
    if (!logEntry) return;
    const match = LOG_ENTRY_COUNTED.find(([event]) => event === logEntry.event);
    if (!match) return;
    const [, connector, name] = match;
    const props = {};
    if (logEntry.data && logEntry.data.motivo) props.reason = logEntry.data.motivo;
    if (logEntry.data && logEntry.data.voice) props.lang = logEntry.data.voice;
    bump(connector, name, props);
  });

  for (const [event, connector, name] of BUS_COUNTED) {
    bus.on(event, (props) => bump(connector, name, props));
  }

  bus.on('telemetry:heartbeat', () => {
    for (const entry of counters.values()) {
      track(entry.connector, entry.name, { ...entry.props, count: entry.count });
    }
    counters.clear();
  });
}

module.exports = { name: 'counters', attach };
