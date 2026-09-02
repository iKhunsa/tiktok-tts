import { cargarIdioma, setIdioma, idiomaGuardado, aplicarTraducciones, detectarIdiomaNavegador, t } from '../../nucleo/i18n/i18n.js';
import { updateChatTogglesSummary, renderChatTogglesState } from './toggles-chat.js';
import { ttsPaused } from '../../nucleo/tts/cola-tts.js';
import { modReload } from './moderacion.js';
import { spRender } from './soundpad.js';
import { renderClipsHistory } from './clips.js';
import { renderSettingsChannels } from './plataformas.js';
import { renderGlobalTTSButton } from '../../nucleo/tts/cola-tts.js';
import { renderShortcutDisplay } from './atajos-teclado.js';
import { renderBlockWordSession } from './moderacion.js';
import { updatePlaylistInfo, musicRenderQueue } from './bot-musica.js';

const LANG_PICKER_COPY = {
  es: { title: 'Elegí tu idioma', sub: 'Así todo lo que te mostremos va a estar en el idioma que prefieras.' },
  en: { title: 'Choose your language', sub: 'This way, everything we show you will be in the language you prefer.' },
  it: { title: 'Scegli la tua lingua', sub: 'Così tutto quello che ti mostreremo sarà nella lingua che preferisci.' },
  pt: { title: 'Escolha seu idioma', sub: 'Assim, tudo que mostrarmos para você vai estar no idioma que preferir.' },
  fr: { title: 'Choisissez votre langue', sub: 'Ainsi, tout ce que nous vous montrerons sera dans la langue de votre choix.' },
  de: { title: 'Wähle deine Sprache', sub: 'So wird alles, was wir dir zeigen, in der Sprache sein, die du bevorzugst.' },
  zh: { title: '选择你的语言', sub: '这样我们展示给你的一切都会是你喜欢的语言。' },
  ja: { title: '言語を選んでください', sub: 'これで表示される内容がすべてご希望の言語になります。' },
  ko: { title: '언어를 선택하세요', sub: '이렇게 하면 모든 내용이 원하시는 언어로 표시됩니다.' },
  ru: { title: 'Выберите язык', sub: 'Тогда всё, что мы вам покажем, будет на выбранном языке.' },
};

/** applyTranslations() de nucleo/i18n solo toca el markup estatico con
 * data-i18n. Cada vista arma contenido en JS con t() al entrar (tabla de
 * moderacion, cola de musica, soundpad, historial de clips, canales
 * guardados, botones de atajo...) y ese texto queda en el idioma viejo
 * hasta salir y volver a entrar. Re-render de todo lo que se pinta con
 * estado ya cacheado en cliente. Se mantiene la busqueda defensiva por
 * `window[fn]` del original: retranslateDynamic corre ANTES de que el
 * bridge de onclick (index.js) haya terminado de exponer todo a window en
 * el primerisimo arranque, y varias de estas funciones viven en vistas
 * que recien se montan/consultan al entrar a esa pantalla. */
function retranslateDynamic() {
  const safe = (fn, ...args) => { try { fn(...args); } catch (e) { console.warn('retranslateDynamic', fn.name, e); } };
  const modView = document.getElementById('view-moderacion');
  if (modView && modView.classList.contains('active')) safe(modReload, false);
  safe(spRender);
  safe(renderClipsHistory);
  safe(renderSettingsChannels);
  safe(renderGlobalTTSButton);
  safe(renderChatTogglesState);
  safe(renderShortcutDisplay);
  safe(renderBlockWordSession);
  safe(updatePlaylistInfo);
  safe(musicRenderQueue);
  // Boton pausa TTS: su label se setea sin data-i18n; refrescar segun estado.
  const pb = document.getElementById('btnPauseTTS');
  if (pb) pb.textContent = ttsPaused ? t('btn.resumeTTS') : t('btn.pauseTTS');
}

async function loadLanguage(lang) {
  await cargarIdioma(lang);
  aplicarTraducciones();
  // aplicarTraducciones() de nucleo/i18n es generico (solo toca [data-i18n]);
  // el resumen de toggle chips no tiene data-i18n y se arma aparte, igual
  // que hacia el applyTranslations() original de index.html.
  updateChatTogglesSummary();
  if (typeof window.refreshPluginStoreTexts === 'function') window.refreshPluginStoreTexts();
  retranslateDynamic();
  const sel = document.getElementById('langSelect');
  if (sel) sel.value = lang;
  document.documentElement.lang = lang;
}

export function setLanguage(lang) {
  // Analytics: solo el cambio explícito del usuario (el restore al arrancar usa
  // loadLanguage directo). Best-effort, nunca bloquea.
  try { window.electronAPI?.trackEvent?.('ui:language-set', lang); } catch (_) { /* noop */ }
  return setIdioma(lang).then(() => loadLanguage(lang));
}

function detectBrowserLang() {
  return detectarIdiomaNavegador(Object.keys(LANG_PICKER_COPY));
}

/** Arranca el flujo de idioma: si ya hay uno guardado, lo carga; si no,
 * muestra el selector para usuarios nuevos con el copy en su idioma de
 * navegador detectado. Devuelve la promesa `langReady` que el resto del
 * arranque espera antes de mostrar cualquier otro popup. */
export function iniciarI18nApp() {
  const saved = idiomaGuardado();
  let resolveReady;
  const langReady = new Promise((r) => { resolveReady = r; });
  window.__langReady = langReady;

  if (saved) {
    const sel = document.getElementById('langSelect');
    if (sel) sel.value = saved;
    loadLanguage(saved).then(resolveReady);
    return langReady;
  }

  const detected = detectBrowserLang();
  const copy = LANG_PICKER_COPY[detected];
  const titleEl = document.getElementById('langPickerTitle');
  const subEl = document.getElementById('langPickerSub');
  if (titleEl) titleEl.textContent = copy.title;
  if (subEl) subEl.textContent = copy.sub;

  window.__pickLanguage = function pickLanguage(lang) {
    document.getElementById('languagePickerModal').classList.remove('show');
    setLanguage(lang).then(resolveReady);
  };

  document.getElementById('languagePickerModal').classList.add('show');
  return langReady;
}

export function pickLanguage(lang) { window.__pickLanguage(lang); }
