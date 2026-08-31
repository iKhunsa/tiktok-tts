'use strict';

const GOOGLE_VOICES = [
  { id: 'es-MX', name: 'Español (México)', flag: 'MX' },
  { id: 'en', name: 'English (USA)', flag: 'US' },
  { id: 'en-GB', name: 'English (UK)', flag: 'GB' },
  { id: 'pt', name: 'Português (Brasil)', flag: 'BR' },
  { id: 'pt-PT', name: 'Português (Portugal)', flag: 'PT' },
  { id: 'fr', name: 'Français', flag: 'FR' },
  { id: 'de', name: 'Deutsch', flag: 'DE' },
  { id: 'it', name: 'Italiano', flag: 'IT' },
  { id: 'ja', name: '日本語 (Japonés)', flag: 'JP' },
  { id: 'zh-CN', name: '中文 (Chino)', flag: 'CN' },
  { id: 'ru', name: 'Русский (Ruso)', flag: 'RU' },
  { id: 'ko', name: '한국어 (Coreano)', flag: 'KR' },
];

function voices() {
  return (_req, res) => res.json([...GOOGLE_VOICES]);
}

module.exports = { voices };
