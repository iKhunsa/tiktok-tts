'use strict';

async function postIdeasWebhook(webhookUrl, embed) {
  const response = await fetch(webhookUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
  });
  if (!response.ok) throw new Error(`Discord webhook HTTP ${response.status}`);
}

module.exports = { postIdeasWebhook };
