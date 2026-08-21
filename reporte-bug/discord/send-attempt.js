'use strict';

const fs = require('fs');
const path = require('path');
const { readFileTail } = require('../read-file-tail');

/**
 * Un intento con un tamano de adjunto dado. Migracion de sendDiscordAttempt
 * (backend-viejo/server.js:2039). A diferencia del original, loguea cada
 * intento fallido individualmente (antes la escalera de intentos no dejaba
 * rastro de los pasos intermedios, solo del resultado final).
 */
async function sendDiscordAttempt(logger, webhookUrl, embed, logFilePath, capBytes, intentoNumero) {
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ embeds: [embed] }));

  let attachedBytes = 0;
  if (logFilePath && capBytes && fs.existsSync(logFilePath)) {
    const fileBuf = await readFileTail(logFilePath, capBytes);
    attachedBytes = fileBuf.length;
    form.append('files[0]', new Blob([fileBuf], { type: 'text/plain' }), path.basename(logFilePath));
  }

  try {
    const resp = await fetch(webhookUrl, { method: 'POST', body: form });
    if (!resp.ok) {
      const bodyText = await resp.text().catch(() => '');
      const err = new Error(`Discord webhook HTTP ${resp.status}: ${bodyText.slice(0, 300)}`);
      err.status = resp.status;
      throw err;
    }
    return attachedBytes;
  } catch (error) {
    logger.log(
      'warn', 'reporte-bug', 'reporte-bug/discord/send-attempt.js#sendDiscordAttempt', 'reporte_bug.discord.intento_fallido',
      `Intento ${intentoNumero} de envio a Discord fallo (cap ${capBytes} bytes)`,
      { intentoNumero, capBytesIntentado: capBytes, statusHttp: error.status || null, error: error.message }
    );
    throw error;
  }
}

module.exports = { sendDiscordAttempt };
