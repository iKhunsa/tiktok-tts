'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LOCALES_DIR = path.join(__dirname, '..', '..', 'interfaz', 'publico', 'locales');

function readLocales() {
  return fs.readdirSync(LOCALES_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const text = fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8');
      return { file, text, data: JSON.parse(text) };
    });
}

module.exports = { readLocales };
