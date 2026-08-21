'use strict';

const fs = require('fs');
const { sendDiscordAttempt } = require('./send-attempt');

// El limite real de adjuntos de un webhook lo pone Discord segun el boost
// del server — se prueba en escalones decrecientes y se cachea en memoria
// el ultimo tamano que funciono. Migracion de postToDiscordWebhook
// (backend-viejo/server.js:2061).
const ATTACHMENT_SIZE_LADDER = [480, 90, 40, 10, 8, 5, 2, 1].map((mb) => Math.round(mb * 1024 * 1024));
let knownGoodAttachmentBytes = 10 * 1024 * 1024;

async function postToDiscordWebhook(logger, webhookUrl, embed, logFilePath) {
  if (!logFilePath || !fs.existsSync(logFilePath)) {
    await sendAndLog(logger, webhookUrl, embed, null, 0, 1);
    return { attached: false, bytes: 0 };
  }

  const candidates = [knownGoodAttachmentBytes, ...ATTACHMENT_SIZE_LADDER]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => b - a);

  let intentoNumero = 0;
  for (const cap of candidates) {
    intentoNumero++;
    try {
      const bytes = await sendDiscordAttempt(logger, webhookUrl, embed, logFilePath, cap, intentoNumero);
      knownGoodAttachmentBytes = cap;
      logExito(logger, true, bytes);
      return { attached: true, bytes };
    } catch (error) {
      if (error.status !== 413) {
        logFalloFinal(logger, error);
        throw error;
      }
    }
  }

  // Ni el escalon mas chico entro: se manda sin adjunto.
  knownGoodAttachmentBytes = ATTACHMENT_SIZE_LADDER[ATTACHMENT_SIZE_LADDER.length - 1];
  await sendAndLog(logger, webhookUrl, embed, null, 0, intentoNumero + 1);
  return { attached: false, bytes: 0 };
}

async function sendAndLog(logger, webhookUrl, embed, logFilePath, cap, intentoNumero) {
  try {
    await sendDiscordAttempt(logger, webhookUrl, embed, logFilePath, cap, intentoNumero);
    logExito(logger, false, 0);
  } catch (error) {
    logFalloFinal(logger, error);
    throw error;
  }
}

function logExito(logger, attached, bytes) {
  logger.log(
    'info', 'reporte-bug', 'reporte-bug/discord/post-webhook.js#postToDiscordWebhook', 'reporte_bug.discord.enviado',
    attached ? `Reporte enviado a Discord con adjunto de ${bytes} bytes` : 'Reporte enviado a Discord sin adjunto',
    { attached, attachedBytes: bytes }
  );
}

function logFalloFinal(logger, error) {
  logger.log(
    'error', 'reporte-bug', 'reporte-bug/discord/post-webhook.js#postToDiscordWebhook', 'reporte_bug.discord.envio_fallido',
    `Fallo definitivo enviando reporte a Discord: ${error.message}`, { error: error.message, stack: error.stack }
  );
}

module.exports = { postToDiscordWebhook };
