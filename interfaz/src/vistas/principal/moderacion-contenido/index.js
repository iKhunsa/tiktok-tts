import { tErr, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { crearAlmacen } from '../../../nucleo/estado/crear-almacen.js';
import { showToast } from '../../../componentes/toast.js';
import { chatGuardApi } from './chat-guard-api.js';
import { createActions, initialState } from './chat-guard-actions.js';
import { mountMasterToggle } from './master-toggle.js';
import { mountLevelPicker } from './level-picker.js';
import { mountCustomOptions } from './custom-options.js';
import { mountModePicker } from './mode-picker.js';
import { mountLanguagePicker } from './language-picker.js';
import { mountWordLists } from './word-lists.js';
import { mountEngineStatus } from './engine-status.js';
import { mountLiveRegion } from './live-region.js';

const TEMPLATE = `
  <div class="settings-section-title"><img class="icon-inline" src="icons/security.svg" alt=""> <span data-i18n="chatGuard.title"></span></div>
  <p class="cg-hint cg-intro" data-i18n="chatGuard.desc"></p>
  <div class="cg-card" id="cgMaster"></div>
  <div class="cg-card" id="cgLevel"><div id="cgLevelPicker"></div><div id="cgCustom" class="cg-custom"></div></div>
  <div class="cg-card" id="cgMode"></div>
  <div class="cg-card" id="cgLanguages"></div>
  <div class="cg-card" id="cgWords"></div>
  <div class="cg-card" id="cgStatus"></div>
  <div class="cg-card cg-people">
    <span class="cg-hint" data-i18n="chatGuard.people.note"></span>
    <button type="button" class="cfg-btn" id="cgGoModeration"><img class="icon-inline" src="icons/security.svg" alt=""><span data-i18n="chatGuard.people.go"></span></button>
  </div>
  <div class="cg-sr-only" id="cgLive"></div>`;

let store = null;
let actions = null;

function notifyError(errorKey) {
  showToast(tErr({ errorKey }, 'chatGuard.toast.saveError'), 'error');
}

export function initModeracionContenido() {
  const root = document.getElementById('chatGuardPanel');
  if (!root || store) return;
  root.innerHTML = TEMPLATE;
  aplicarTraducciones(root);

  store = crearAlmacen(initialState());
  actions = createActions({ store, api: chatGuardApi, notify: notifyError });
  const part = { store, actions };
  const at = (id) => root.querySelector(`#${id}`);

  mountMasterToggle(at('cgMaster'), part);
  mountLevelPicker(at('cgLevelPicker'), part);
  mountCustomOptions(at('cgCustom'), part);
  mountModePicker(at('cgMode'), part);
  mountLanguagePicker(at('cgLanguages'), part);
  mountWordLists(at('cgWords'), part);
  mountEngineStatus(at('cgStatus'), part);
  mountLiveRegion(at('cgLive'), part);
  at('cgGoModeration').addEventListener('click', () => window.switchView('moderacion'));

  actions.load();
}

// Se llama al entrar a Ajustes: el estado del motor pudo cambiar desde la ultima vez.
export function reloadModeracionContenido() {
  if (actions) actions.load();
}

export function updateBlockedWords(words) {
  if (actions && Array.isArray(words)) actions.replaceBlockedWords(words);
}

// Cambio de idioma de la UI: los textos armados con t() se redibujan.
export function retranslateModeracionContenido() {
  if (store) store.setState({});
}
