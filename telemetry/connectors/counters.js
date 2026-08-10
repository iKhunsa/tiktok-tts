'use strict';

// Eventos de alta frecuencia: TTS, soundpad, moderacion y musica.
//
// No se manda uno por mensaje. Se acumulan en contadores y se vuelcan en cada
// latido (5 min). Un directo de 4 horas genera unas decenas de eventos en vez
// de decenas de miles.

const COUNTED = [
  // [evento del bus,            conector,     nombre del evento]
  ['tts:spoken',                 'tts',        'spoken'],
  ['tts:skipped',                'tts',        'skipped'],
  ['tts:rate-limited',           'tts',        'rate_limited'],
  ['tts:queue-overflow',         'tts',        'queue_overflow'],
  ['music:request',              'music',      'request'],
  ['music:skip',                 'music',      'skip'],
  ['music:playlist-play',        'music',      'playlist_play'],
  ['soundpad:triggered',         'soundpad',   'triggered'],
  ['moderation:message-filtered','moderation', 'message_filtered'],
  ['moderation:word-blocked',    'moderation', 'word_blocked'],
  ['moderation:user-muted',      'moderation', 'user_muted'],
  ['moderation:user-banned',     'moderation', 'user_banned'],
  ['moderation:tts-skipped-nonfollower', 'moderation', 'tts_skipped_nonfollower'],
];

function attach(bus, track) {
  // clave "conector.nombre" → { count, props }
  const counters = new Map();

  const bump = (connector, name, props) => {
    const key = `${connector}.${name}`;
    const entry = counters.get(key) || { connector, name, count: 0, props: {} };
    entry.count++;
    // Se guardan las props de la ULTIMA ocurrencia: el idioma del TTS o el
    // motivo del filtro son cualitativos, no se pueden sumar.
    if (props && typeof props === 'object') Object.assign(entry.props, props);
    counters.set(key, entry);
  };

  for (const [event, connector, name] of COUNTED) {
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
