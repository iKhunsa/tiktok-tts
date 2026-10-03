import { LOCALES } from './chat-guard-options.js';
import { findWordProblem, normalizeWord } from './word-rules.js';

const STATUS_KEY_BY_CONFIG_KEY = {
  rustGuardEnabled: 'enabled',
  rustGuardMode: 'mode',
  chatGuardLevel: 'level',
  chatGuardLangs: 'langs',
  chatGuardCustom: 'custom',
};

export function initialState() {
  return {
    phase: 'loading', // loading | ready | error
    loadErrorKey: '',
    status: null,
    words: { blocked: [], allowed: [] },
    tab: 'blocked',
    query: '',
    wordProblem: null,
    langProblem: false,
    saving: false,
    announce: null,
  };
}

function toStatusPatch(configPatch) {
  return Object.fromEntries(Object.entries(configPatch).map(([key, value]) => [STATUS_KEY_BY_CONFIG_KEY[key], value]));
}

const sortWords = (words) => [...words].sort((a, b) => a.localeCompare(b));

// Toda la logica del panel; las vistas solo dibujan y llaman a estas funciones.
// notify(errorKey) muestra un error al usuario (toast), lo inyecta index.js.
export function createActions({ store, api, notify }) {
  let announcements = 0;

  function announce(key, labelKey) {
    announcements += 1;
    store.setState({ announce: { key, labelKey, count: announcements } });
  }

  async function refreshStatus() {
    const result = await api.getStatus();
    if (!result.ok) return;
    store.setState((state) => ({ status: result.data, words: { ...state.words, allowed: result.data.allowedWords || [] } }));
  }

  async function load() {
    const [status, blocked] = await Promise.all([api.getStatus(), api.getBlockedWords()]);
    if (!status.ok) {
      // Con datos ya pintados, un refresco fallido no debe esconder el panel.
      if (!store.getState().status) store.setState({ phase: 'error', loadErrorKey: status.errorKey });
      return;
    }
    store.setState((state) => ({
      phase: 'ready',
      loadErrorKey: '',
      status: status.data,
      words: {
        blocked: blocked.ok ? sortWords(blocked.data.words || []) : state.words.blocked,
        allowed: status.data.allowedWords || [],
      },
    }));
  }

  // Guardado optimista: se pinta ya y, si el servidor lo rechaza, vuelve al valor anterior.
  async function saveConfig(patch) {
    const previous = store.getState().status;
    store.setState({ status: { ...previous, ...toStatusPatch(patch) }, saving: true });
    const result = await api.patchConfig(patch);
    if (!result.ok) {
      store.setState({ status: previous, saving: false });
      notify(result.errorKey);
      return false;
    }
    store.setState({ saving: false });
    await refreshStatus();
    return true;
  }

  const setEnabled = (enabled) => saveConfig({ rustGuardEnabled: enabled });
  const setMode = (mode) => saveConfig({ rustGuardMode: mode });

  async function setLevel(level, labelKey) {
    const saved = await saveConfig({ chatGuardLevel: level });
    if (saved) announce('chatGuard.announce.levelChanged', labelKey);
  }

  function setCustomOption(option, enabled) {
    const { custom } = store.getState().status;
    return saveConfig({ chatGuardCustom: { ...custom, [option]: enabled } });
  }

  function setLanguage(code, enabled) {
    const current = store.getState().status.langs;
    const next = LOCALES.map((locale) => locale.code).filter((candidate) => (candidate === code ? enabled : current.includes(candidate)));
    if (next.length === 0) {
      store.setState({ langProblem: true });
      return Promise.resolve(false);
    }
    store.setState({ langProblem: false });
    return saveConfig({ chatGuardLangs: next });
  }

  function setTab(tab) {
    store.setState({ tab, query: '', wordProblem: null });
  }

  function setQuery(query) {
    store.setState({ query });
  }

  function clearWordProblem() {
    if (store.getState().wordProblem) store.setState({ wordProblem: null });
  }

  function storeWords(list, response) {
    const words = list === 'blocked' ? sortWords(response.words || []) : response.allowedWords || [];
    store.setState((state) => ({ wordProblem: null, words: { ...state.words, [list]: words } }));
  }

  async function addWord(list, rawWord) {
    const word = normalizeWord(rawWord);
    const problem = findWordProblem({ word, list, words: store.getState().words });
    if (problem) {
      store.setState({ wordProblem: problem });
      return false;
    }
    const result = await (list === 'blocked' ? api.addBlockedWord(word) : api.addAllowedWord(word));
    if (!result.ok) {
      store.setState({ wordProblem: { key: result.errorKey } });
      return false;
    }
    storeWords(list, result.data);
    announce('chatGuard.words.added');
    return true;
  }

  async function removeWord(list, word) {
    const result = await (list === 'blocked' ? api.removeBlockedWord(word) : api.removeAllowedWord(word));
    if (!result.ok) {
      notify(result.errorKey);
      return false;
    }
    storeWords(list, result.data);
    announce('chatGuard.words.removed');
    return true;
  }

  return {
    load, setEnabled, setMode, setLevel, setCustomOption, setLanguage,
    setTab, setQuery, clearWordProblem, addWord, removeWord,
  };
}
