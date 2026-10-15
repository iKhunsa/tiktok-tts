// Corre antes de electron-builder (prebuild:electron). Genera en build/ los
// textos que muestra el instalador NSIS a partir de docs/legal/*.md (fuente
// unica): license_<idioma>.txt (Terminos + Privacidad) y terms-version.nsh.
'use strict';
const fs = require('fs');
const path = require('path');
const { markdownToPlainText } = require('./markdown-to-plain-text');
const { readDocumentVersion } = require('./read-document-version');

const LEGAL_DIR = path.join(__dirname, '..', 'docs', 'legal');
const BUILD_DIR = path.join(__dirname, '..', 'build');
const SECTION_SEPARATOR = `\r\n\r\n${'='.repeat(60)}\r\n\r\n`;

const LANGUAGES = [
  { lang: 'es', files: ['terminos-y-condiciones.md', 'politica-de-privacidad.md'] },
  { lang: 'en', files: ['terms-and-conditions.en.md', 'privacy-policy.en.md'] },
];

const readLegalFile = (name) => fs.readFileSync(path.join(LEGAL_DIR, name), 'utf8');

function licenseTextFor({ files }) {
  return files.map((name) => markdownToPlainText(readLegalFile(name))).join(SECTION_SEPARATOR);
}

function termsVersion() {
  const versions = new Set(
    LANGUAGES.flatMap(({ files }) => files.map((name) => readDocumentVersion(readLegalFile(name))))
  );
  if (versions.size !== 1) throw new Error(`Los textos legales tienen versiones distintas: ${[...versions]}`);
  return [...versions][0];
}

fs.mkdirSync(BUILD_DIR, { recursive: true });
for (const language of LANGUAGES) {
  fs.writeFileSync(path.join(BUILD_DIR, `license_${language.lang}.txt`), licenseTextFor(language), 'utf8');
}
fs.writeFileSync(path.join(BUILD_DIR, 'terms-version.nsh'), `!define TERMS_VERSION "${termsVersion()}"\r\n`);
console.log(`[prebuild] build/license_*.txt y terms-version.nsh generados (versión ${termsVersion()}).`);
