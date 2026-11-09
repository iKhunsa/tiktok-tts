'use strict';

// Detecta cuando termina el directo de Twitch / Kick / YouTube. Esos chats
// siguen CONECTADOS despues del fin del stream (la sala queda vacia pero el
// socket no se cae), asi que "canal conectado" no es "streamer transmitiendo"
// y la senal de telemetria app/live seguiria para siempre. TikTok no pasa por
// aca: ya avisa el fin del directo por su cuenta (streamEnd/checkAlive).
//
// Mientras un canal este conectado se le pregunta a la plataforma cada
// `intervalMs` si sigue en vivo y se emite `canal:live {platform, channel,
// live}` cuando cambia el veredicto. Reglas, pensadas para no perjudicar a
// streamers chicos:
//  - Solo una respuesta "offline" CONFIRMADA cuenta. Un fallo de la consulta
//    (null) no cambia nada: se mantiene el veredicto anterior.
//  - Estando en vivo, hacen falta `fallosParaCortar` offline SEGUIDOS (3 x 60 s
//    = ~3 min) para darlo por terminado. Cubre cortes cortos y reinicios del
//    stream.
//  - Si al conectar todavia no esta en vivo (el streamer abrio la app antes de
//    arrancar) alcanza una respuesta: se marca no-vivo y pasa a vivo apenas la
//    plataforma lo confirma.
//  - Nunca se desconecta el chat ni se cierra la app: solo se emite el evento.

const PLATAFORMAS = new Set(['twitch', 'kick', 'youtube']);

function crearMonitorEnVivo({ bus, logger, check, intervalMs = 60 * 1000, fallosParaCortar = 3 }) {
  const entradas = new Map(); // `${platform}:${channel}` -> entrada

  function emitir(e) {
    bus.emit('canal:live', { platform: e.platform, channel: e.channel, live: e.live });
  }

  /** Una ronda de chequeo para un canal. Devuelve cuando termino (para tests). */
  async function chequear(key) {
    const e = entradas.get(key);
    if (!e || e.enCurso) return;
    e.enCurso = true;
    let resultado = null;
    try { resultado = await check(e.platform, e.channel); } catch (_) { resultado = null; }
    e.enCurso = false;
    if (entradas.get(key) !== e) return; // se desconecto mientras preguntabamos

    if (resultado === true) {
      e.fallos = 0;
      if (e.live !== true) {
        e.live = true;
        logger.log('info', 'canales', 'canales/live-status/live-monitor.js#chequear', 'canales.live.en_vivo',
          `${e.platform} ${e.channel}: directo en vivo`, { platform: e.platform, channel: e.channel });
        emitir(e);
      }
    } else if (resultado === false) {
      if (e.live === true) {
        e.fallos += 1;
        if (e.fallos >= fallosParaCortar) {
          e.live = false;
          logger.log('info', 'canales', 'canales/live-status/live-monitor.js#chequear', 'canales.live.terminado',
            `${e.platform} ${e.channel}: directo terminado (${e.fallos} chequeos offline seguidos)`,
            { platform: e.platform, channel: e.channel, chequeos: e.fallos });
          e.fallos = 0;
          emitir(e);
        }
      } else if (e.live === null) {
        e.live = false; // nunca estuvo en vivo: no hay nada que esperar
        emitir(e);
      }
    }
    // resultado === null: no se pudo saber -> se conserva todo como estaba.
  }

  function detener(key) {
    const e = entradas.get(key);
    if (!e) return;
    clearInterval(e.timer);
    entradas.delete(key);
  }

  bus.on('canal:estado', (payload) => {
    if (!payload || !PLATAFORMAS.has(payload.platform) || !payload.channel) return;
    const key = `${payload.platform}:${payload.channel}`;

    if (payload.state === 'conectado') {
      if (entradas.has(key)) return; // reconexion del chat sin haber cortado: sigue el mismo monitoreo
      const e = { platform: payload.platform, channel: payload.channel, live: null, fallos: 0, enCurso: false, timer: null };
      e.timer = setInterval(() => { chequear(key); }, intervalMs);
      if (typeof e.timer.unref === 'function') e.timer.unref();
      entradas.set(key, e);
      chequear(key); // sin esperar el primer intervalo
    } else if (payload.state === 'desconectado') {
      detener(key);
    }
  }, 'canales');

  function stop() {
    for (const key of [...entradas.keys()]) detener(key);
  }

  return { stop, chequear, _entradas: entradas };
}

module.exports = { crearMonitorEnVivo };
