const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'interfaz', 'index.html'), 'utf8');
const sectionStart = html.indexOf('<div class="settings-section" id="settingsSectionVoice">');
const sectionEnd = html.indexOf('<!-- KEYBOARD SHORTCUTS SECTION -->', sectionStart);
const voiceSection = html.slice(sectionStart, sectionEnd);

const expectedIds = [
  'settingsSectionVoice', 'btnVoiceTour', 'voiceSelectGroup', 'voiceDropdown',
  'voiceDropdownTrigger', 'voiceDropdownFlag', 'voiceDropdownText', 'voiceDropdownMenu',
  'voiceSelect', 'voiceTestGroup', 'testVoiceInput', 'btnTestVoice', 'voiceRateGroup',
  'rateVal', 'rateRange', 'voiceVolGroup', 'volVal', 'volRange', 'voiceLangFilterGroup',
  'langFilterToggle', 'voiceDictFilterGroup', 'dictFilterToggle', 'btnOpenDictLangModal',
  'voiceAnnounceGroup', 'announceTplFields',
];

const expectedHandlers = [
  'onclick="startVoiceTour()"',
  'onclick="toggleVoiceDropdown()"',
  'onclick="testVoice()"',
  'oninput="updateRate(this.value)"',
  'oninput="updateVol(this.value)"',
  'onchange="toggleLangFilter(this)"',
  'onchange="toggleDictFilter(this)"',
  'onclick="openDictLangModal()"',
];

const expectedI18n = [
  'data-i18n="settings.voice"',
  'data-i18n="tour.viewTutorial"',
  'data-i18n="label.voice"',
  'data-i18n="label.testVoice"',
  'data-i18n-placeholder="label.testVoicePlaceholder"',
  'data-i18n="label.slow"',
  'data-i18n="label.fast"',
  'data-i18n="label.mute"',
  'data-i18n="label.max"',
  'data-i18n="toggle.langFilter"',
  'data-i18n="toggle.langFilterHint"',
  'data-i18n="toggle.dictFilter"',
  'data-i18n="dictLang.title"',
  'data-i18n="toggle.dictFilterHint"',
  'data-i18n="settings.announceTplTitle"',
  'data-i18n="settings.announceTplDesc"',
];

test('Voz y audio conserva ids, handlers y contratos i18n', () => {
  assert.notEqual(sectionStart, -1, 'falta #settingsSectionVoice');
  assert.notEqual(sectionEnd, -1, 'falta el limite de la seccion Voz y audio');

  const ids = [...voiceSection.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, expectedIds);

  const handlers = [...voiceSection.matchAll(/\b(?:onclick|oninput|onchange)="[^"]+"/g)].map((match) => match[0]);
  assert.deepEqual(handlers, expectedHandlers);

  for (const attribute of expectedI18n) {
    assert.ok(voiceSection.includes(attribute), `falta ${attribute}`);
  }
});

test('interfaz/index.html no contiene ids duplicados', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});
