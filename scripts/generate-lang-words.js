#!/usr/bin/env node
// Genera public/lang-words/{lang}.json con las palabras más frecuentes por idioma.
//
// Fuente: hermitdave/FrequencyWords (https://github.com/hermitdave/FrequencyWords)
// Listas derivadas de OpenSubtitles 2018 — licencia CC-BY-SA-4.0.
//
// Uso: node scripts/generate-lang-words.js
// Requiere Node 18+ (fetch global). Solo se corre en desarrollo; los JSON
// generados se commitean y se empaquetan junto con public/.

const fs = require('fs');
const path = require('path');

const LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it'];
const TOP_N = 2000;
const OUT_DIR = path.join(__dirname, '..', 'public', 'lang-words');

const SOURCE_URL = (lang) =>
  `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${lang}/${lang}_50k.txt`;

async function generate(lang) {
  const url = SOURCE_URL(lang);
  console.log(`[${lang}] descargando ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[${lang}] HTTP ${res.status} al descargar ${url}`);
  const text = await res.text();

  const words = [];
  for (const line of text.split('\n')) {
    if (words.length >= TOP_N) break;
    const token = line.split(' ')[0].toLowerCase().normalize('NFC');
    // Solo letras (sin números, apóstrofes ni basura OCR) y mínimo 2 caracteres.
    if (token.length < 2) continue;
    if (!/^\p{L}+$/u.test(token)) continue;
    words.push(token);
  }
  if (words.length < TOP_N) {
    console.warn(`[${lang}] aviso: solo ${words.length} palabras válidas (< ${TOP_N})`);
  }

  const outFile = path.join(OUT_DIR, `${lang}.json`);
  fs.writeFileSync(outFile, JSON.stringify(words), 'utf-8');
  console.log(`[${lang}] escrito ${outFile} (${words.length} palabras)`);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const lang of LANGS) await generate(lang);
  console.log('Listo.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
