'use strict';

const fs = require('node:fs');
const path = require('node:path');

const localesDir = path.join(__dirname, '..', 'interfaz', 'publico', 'locales');
const countLeaves = (value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.values(value).reduce((count, child) => count + countLeaves(child), 0)
  : 1;

const counts = fs.readdirSync(localesDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => [file, countLeaves(JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')))]);

console.table(Object.fromEntries(counts));
if (new Set(counts.map(([, count]) => count)).size !== 1) {
  console.error('Las cantidades de claves hoja no coinciden.');
  process.exit(1);
}

console.log(`Paridad OK: ${counts.length} locales con ${counts[0][1]} claves hoja cada uno.`);
