/**
 * Orquestador de advanced.html. Mismo rol que vistas/principal/index.js
 * pero para esta vista mucho mas chica (15 handlers onclick/onchange vs
 * 248 en index.html): arranque + puente window para el markup.
 */
import { iniciarCapturaErroresCliente } from '../../nucleo/log-storage.js';
import { cargarIdioma, idiomaGuardado, aplicarTraducciones, t, tErr } from '../../nucleo/i18n/i18n.js';

import { toggleRateLimit, saveRateLimit } from './rate-limit.js';
import { saveGeneral } from './config-general.js';
import { saveAccessibility } from './accesibilidad.js';
import { addBlockedWord, loadBlockedWords, saveBlockedWords } from './palabras-bloqueadas.js';
import { loadMdContent, saveMdContent, uploadMdFile, downloadMd } from './editor-md.js';
import { downloadAllLogs } from './logs.js';
import { refreshStatus, iniciarPollingEstado } from './estado-servidor.js';
import { focusHashPanel, iniciarModoPopup } from './deep-link.js';
import { iniciarCargaInicial } from './carga-inicial.js';

// ─── Puente onclick/onchange: el markup los invoca como globales ──────────
Object.assign(window, {
  t, tErr,
  toggleRateLimit, saveRateLimit,
  saveGeneral,
  saveAccessibility,
  addBlockedWord, saveBlockedWords,
  loadMdContent, saveMdContent, uploadMdFile, downloadMd,
  downloadAllLogs,
  refreshStatus,
});

async function iniciarI18n() {
  const lang = idiomaGuardado() || 'es';
  await cargarIdioma(lang);
  aplicarTraducciones();
}

function iniciarArranque() {
  iniciarCapturaErroresCliente();
  iniciarI18n();
  iniciarCargaInicial();
  loadBlockedWords();
  loadMdContent();
  refreshStatus();
  focusHashPanel();
  window.addEventListener('hashchange', focusHashPanel);
  iniciarPollingEstado();
  iniciarModoPopup();
}

iniciarArranque();
