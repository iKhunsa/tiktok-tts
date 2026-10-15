const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const html = readFileSync(resolve(__dirname, '../interfaz/index.html'), 'utf8');
const sectionStart = html.indexOf('<div class="settings-section" id="settingsSectionShortcuts">');
const sectionEnd = html.indexOf('<div class="settings-section" id="chatGuardPanel"', sectionStart);
const shortcutsSection = html.slice(sectionStart, sectionEnd);

test('la sección conserva sus contratos y no duplica ids', () => {
  const requiredIds = [
    'settingsSectionShortcuts', 'btnShortcutsTour', 'scGroupPauseBtn', 'btnPauseTTS',
    'scGroupPause', 'pauseShortcutInput', 'pauseShortcutHint', 'scGroupSkip',
    'skipShortcutInput', 'skipShortcutHint', 'scGroupClear', 'clearShortcutInput',
    'clearShortcutHint', 'scGroupMusicPause', 'musicPauseShortcutInput',
    'musicPauseShortcutHint', 'scGroupMusicSkip', 'musicSkipShortcutInput',
    'musicSkipShortcutHint',
  ];
  const requiredHandlers = [
    'startShortcutsTour()', 'togglePauseTts()', "startCapturingShortcut('pause')",
    "clearTtsShortcut('pause')", "applyTtsShortcutPreset('pause', 'F8')",
    "applyTtsShortcutPreset('pause', 'MediaPlayPause')", "startCapturingShortcut('skip')",
    "clearTtsShortcut('skip')", "applyTtsShortcutPreset('skip', 'F9')",
    "startCapturingShortcut('clear')", "clearTtsShortcut('clear')",
    "applyTtsShortcutPreset('clear', 'F10')", "startCapturingShortcut('musicPause')",
    "clearTtsShortcut('musicPause')", "applyTtsShortcutPreset('musicPause', 'F11')",
    "startCapturingShortcut('musicSkip')", "clearTtsShortcut('musicSkip')",
    "applyTtsShortcutPreset('musicSkip', 'F12')",
  ];
  const requiredI18nCounts = {
    'data-i18n=settings.shortcuts': 1,
    'data-i18n=tour.viewTutorial': 1,
    'data-i18n=label.playbackControl': 1,
    'data-i18n=btn.pauseTTS': 1,
    'data-i18n=label.pauseShortcut': 1,
    'data-i18n-placeholder=conn.shortcutCapturing': 5,
    'data-i18n=btn.clearShortcut': 5,
    'data-i18n=btn.useF8': 1,
    'data-i18n=btn.usePlayPause': 1,
    'data-i18n=conn.shortcutHint': 5,
    'data-i18n=label.skipShortcut': 1,
    'data-i18n=label.clearChatAndQueueShortcut': 1,
    'data-i18n=label.musicPauseShortcut': 1,
    'data-i18n=label.musicSkipShortcut': 1,
  };

  assert.notEqual(sectionStart, -1);
  assert.notEqual(sectionEnd, -1);
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(allIds).size, allIds.length, 'hay ids duplicados en index.html');
  for (const id of requiredIds) assert.match(shortcutsSection, new RegExp(`\\bid="${id}"`));

  const handlers = [...shortcutsSection.matchAll(/\b(?:onclick|oninput|onchange)="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(handlers, requiredHandlers);

  const i18nCounts = {};
  for (const match of shortcutsSection.matchAll(/\b(data-i18n(?:-[\w-]+)?)="([^"]+)"/g)) {
    const contract = `${match[1]}=${match[2]}`;
    i18nCounts[contract] = (i18nCounts[contract] || 0) + 1;
  }
  for (const [contract, count] of Object.entries(requiredI18nCounts)) assert.equal(i18nCounts[contract], count, contract);
  assert.doesNotMatch(shortcutsSection, /\sstyle="/);
  assert.doesNotMatch(shortcutsSection, /[⏸▶✕]/u);
});

test('las pestañas cambian panel y admiten navegación con flechas', async () => {
  const listeners = new Map();
  const makeTab = (id, panelId, active = false) => ({
    id,
    tabIndex: active ? 0 : -1,
    attributes: { 'aria-controls': panelId, 'aria-selected': String(active) },
    classList: { active, toggle(name, value) { if (name === 'active') this.active = value; } },
    addEventListener(type, callback) { listeners.set(`${id}:${type}`, callback); },
    getAttribute(name) { return this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
  });
  const tabs = [
    makeTab('tts', 'panel-tts', true),
    makeTab('music', 'panel-music'),
    makeTab('general', 'panel-general'),
  ];
  const panels = [
    { id: 'panel-tts', hidden: false },
    { id: 'panel-music', hidden: true },
    { id: 'panel-general', hidden: true },
  ];
  const originalDocument = global.document;
  global.document = {
    querySelectorAll(selector) { return selector.includes('tabpanel') ? panels : tabs; },
  };

  try {
    const moduleUrl = pathToFileURL(resolve(__dirname, '../interfaz/src/vistas/principal/tabs-atajos.js'));
    const { iniciarTabsAtajos } = await import(moduleUrl.href);
    iniciarTabsAtajos();
    listeners.get('music:click')();
    assert.equal(tabs[1].attributes['aria-selected'], 'true');
    assert.equal(panels[1].hidden, false);
    assert.equal(panels[0].hidden, true);

    let prevented = false;
    listeners.get('music:keydown')({ key: 'ArrowRight', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(tabs[2].focused, true);
    assert.equal(panels[2].hidden, false);
  } finally {
    global.document = originalDocument;
  }
});
