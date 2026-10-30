'use strict';

const NOT_A_FORUM = 220003; // canal de texto normal: no acepta thread_name

function send(webhookUrl, payload, file) {
  if (!file) {
    return fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  }
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  form.append('files[0]', new Blob([file.buffer], { type: file.type }), file.name);
  return fetch(webhookUrl, { method: 'POST', body: form });
}

// Un webhook hacia un canal de FORO exige thread_name (cada idea crea un hilo).
// Si el canal no es un foro, Discord responde 220003 y se reintenta sin hilo.
async function postIdeasWebhook(webhookUrl, embed, { threadName, file } = {}) {
  const base = { embeds: [embed], allowed_mentions: { parse: [] } };
  let response = await send(webhookUrl, threadName ? { ...base, thread_name: threadName } : base, file);
  if (response.status === 400 && threadName) {
    const body = await response.json().catch(() => ({}));
    if (body.code === NOT_A_FORUM) response = await send(webhookUrl, base, file);
  }
  if (!response.ok) throw new Error(`Discord webhook HTTP ${response.status}`);
}

module.exports = { postIdeasWebhook };
