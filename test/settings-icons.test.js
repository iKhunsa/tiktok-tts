'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const INDEX_PATH = path.join(__dirname, '..', 'interfaz', 'index.html');
const EXCLUDED_SECTION_IDS = ['settingsSectionVoice', 'settingsSectionShortcuts', 'chatGuardPanel'];
const PICTOGRAM_PATTERN = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\uFE0F＋✕✓▶▼⏸⚠●→]/u;

function extractDivById(html, id) {
  const idIndex = html.indexOf(`id="${id}"`);
  assert.notEqual(idIndex, -1, `no se encontró #${id}`);

  const start = html.lastIndexOf('<div', idIndex);
  const divTag = /<\/?div\b[^>]*>/gi;
  divTag.lastIndex = start;
  let depth = 0;

  for (let match; (match = divTag.exec(html));) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, divTag.lastIndex);
  }

  assert.fail(`#${id} no tiene cierre`);
}

test('configuración no usa emojis ni pictogramas como iconos fuera de las secciones excluidas', () => {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  let settings = extractDivById(html, 'view-settings');

  for (const id of EXCLUDED_SECTION_IDS) {
    settings = settings.replace(extractDivById(html, id), '');
  }

  assert.doesNotMatch(settings, PICTOGRAM_PATTERN);
});
