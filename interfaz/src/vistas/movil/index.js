/**
 * Orquestador de mobile.html. Mismo rol que vistas/principal/index.js
 * pero para el panel remoto (25 handlers onclick/oninput vs 248 de
 * index.html): arranque + puente window para el markup.
 */
import { iniciarCapturaErroresCliente } from '../../nucleo/log-storage.js';
import { cargarIdioma, idiomaGuardado, aplicarTraducciones } from '../../nucleo/i18n/i18n.js';
import { connectWS } from './cliente-ws.js';
import { iniciarGuardaScroll } from './chat.js';
import { toggleGlobal, togglePause, toggleChip } from './control.js';
import { deleteClip } from './clips.js';
import { padPlay } from './soundpad.js';
import { switchTab } from './tabs.js';
import { cmd } from './comandos.js';
import { mMusicToggle, mMusicSkip, mMusicVolume, mPlaylistToggle, mInit } from './bot-musica.js';

// ─── Puente onclick/oninput: el markup los invoca como globales ───────────
Object.assign(window, {
  toggleGlobal, togglePause, toggleChip, cmd,
  deleteClip, padPlay, switchTab,
  mMusicToggle, mMusicSkip, mMusicVolume, mPlaylistToggle,
});

async function iniciarI18n() {
  const lang = idiomaGuardado() || 'es';
  await cargarIdioma(lang);
  aplicarTraducciones();
  connectWS();
}

function iniciarArranque() {
  iniciarCapturaErroresCliente();
  iniciarGuardaScroll();
  mInit();
  iniciarI18n();
}

iniciarArranque();
