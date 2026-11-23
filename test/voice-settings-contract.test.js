const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'interfaz', 'index.html'), 'utf8');
// Voz y audio quedo repartido en pestañas (Voz / Avisos / Filtros): se valida
// la vista de Ajustes completa, hasta el banner que redirige a Moderacion.
const sectionStart = html.indexOf('<div class="view" id="view-settings">');
const sectionEnd = html.indexOf('<div class="settings-section ajustes-filtro">', sectionStart);
const voiceSection = html.slice(sectionStart, sectionEnd);

const expectedIds = [
  'settingsSectionVoice', 'btnVoiceTour', 'voiceSelectGroup', 'voiceDropdown',
  'voiceDropdownTrigger', 'voiceDropdownFlag', 'voiceDropdownText', 'voiceDropdownMenu',
  'voiceSelect', 'voiceTestGroup', 'testVoiceInput', 'btnTestVoice', 'voiceRateGroup',
  'rateVal', 'rateRange', 'voicePitchGroup', 'pitchVal', 'pitchRange', 'voiceVolGroup',
  'volVal', 'volRange',
  'voiceAnnounceGroup', 'announceTplFields', 'voiceAnnounceVolGroup', 'announceVolVal', 'announceVolRange',
  'voiceLangFilterGroup', 'langFilterToggle', 'voiceDictFilterGroup', 'dictFilterToggle', 'btnOpenDictLangModal',
];

const expectedHandlers = [
  'onclick="startVoiceTour()"',
  'onclick="toggleVoiceDropdown()"',
  'onclick="testVoice()"',
  'oninput="updateRate(this.value)"',
  'oninput="updatePitch(this.value)"',
  'oninput="updateVol(this.value)"',
  'oninput="updateAnnounceVol(this.value)"',
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
  'data-i18n="label.pitch"',
  'data-i18n="label.pitchLow"',
  'data-i18n="label.pitchHigh"',
  'data-i18n="label.mute"',
  'data-i18n="label.max"',
  'data-i18n="toggle.langFilter"',
  'data-i18n="toggle.langFilterHint"',
  'data-i18n="toggle.dictFilter"',
  'data-i18n="dictLang.title"',
  'data-i18n="toggle.dictFilterHint"',
  'data-i18n="settings.announceTplTitle"',
  'data-i18n="settings.announceTplDesc"',
  'data-i18n="settings.announceVolTitle"',
];

test('Voz y audio conserva ids, handlers y contratos i18n', () => {
  assert.notEqual(sectionStart, -1, 'falta #settingsSectionVoice');
  assert.notEqual(sectionEnd, -1, 'falta el limite de la seccion Voz y audio');

  const ids = [...voiceSection.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  // Las pestañas intercalan ids propios: se exige que esten todos los esperados, en orden.
  assert.deepEqual(ids.filter((id) => expectedIds.includes(id)), expectedIds);

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
