import { appSettings, saveSettings } from '../../nucleo/estado/ajustes-app.js';
import { setLangFilterEnabled, setDictFilterEnabled } from '../../nucleo/estado/config-runtime.js';
import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { playAudioBlob } from '../../nucleo/tts/cola-tts.js';

let availableVoices = [];
let selectedVoice = null;

const voiceSelect = document.getElementById('voiceSelect');
const voiceDropdownTrigger = document.getElementById('voiceDropdownTrigger');
const voiceDropdownMenu = document.getElementById('voiceDropdownMenu');
const voiceDropdownFlag = document.getElementById('voiceDropdownFlag');
const voiceDropdownText = document.getElementById('voiceDropdownText');

function updateVoiceDisplay(voiceObj) {
  if (!voiceObj) return;
  voiceSelect.value = voiceObj.id;
  voiceDropdownFlag.src = 'flags/' + voiceObj.flag + '.svg';
  voiceDropdownFlag.alt = voiceObj.name;
  voiceDropdownText.textContent = voiceObj.name;
}

export function toggleVoiceDropdown() {
  const isOpen = voiceDropdownMenu.classList.contains('show');
  if (isOpen) {
    voiceDropdownMenu.classList.remove('show');
    voiceDropdownTrigger.classList.remove('open');
  } else {
    voiceDropdownMenu.classList.add('show');
    voiceDropdownTrigger.classList.add('open');
  }
}

function closeVoiceDropdown() {
  voiceDropdownMenu.classList.remove('show');
  voiceDropdownTrigger.classList.remove('open');
}

// PATCH de config con aviso: si el guardado falla, el usuario cree que su
// cambio quedo y al recargar vuelve atras. Toast + reporte al server (-> GlitchTip).
export function patchConfigSetting(patch) {
  return fetch('/api/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); })
    .catch((err) => {
      const claves = Object.keys(patch).join(', ');
      try { showToast(t('toast.settingSaveFailed', { keys: claves }) || 'No se pudo guardar el ajuste', 'error'); } catch (_) { /* noop */ }
      fetch('/api/logs/client', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Fallo al guardar ajuste (' + claves + '): ' + err.message, source: 'config-patch' }) }).catch(() => {});
    });
}

export function syncTtsVoiceLang(id) {
  patchConfigSetting({ ttsVoiceLang: id });
}

// langFilterEnabled/dictFilterEnabled ya no pasan por appSettings/localStorage
// (fase-05): config-runtime.js es el unico dueño, PATCHea el servidor
// directo y guarda el valor en memoria — ver nucleo/estado/config-runtime.js.
export function toggleLangFilter(checkbox) {
  checkbox.closest('.toggle-chip')?.classList.toggle('active', checkbox.checked);
  setLangFilterEnabled(checkbox.checked);
}

export function toggleDictFilter(checkbox) {
  checkbox.closest('.toggle-chip')?.classList.toggle('active', checkbox.checked);
  setDictFilterEnabled(checkbox.checked);
}

export function toggleSayUsernameConnector(checkbox) {
  appSettings.sayUsernameConnector = checkbox.checked;
  checkbox.closest('.toggle-chip')?.classList.toggle('active', checkbox.checked);
  saveSettings();
}

export function updateConnectorChipState() {
  const chip = document.getElementById('chip-username-connector');
  const cb = document.getElementById('sayUsernameConnectorToggle');
  if (!chip || !cb) return;
  const enabled = !!appSettings.sayUsername;
  cb.disabled = !enabled;
  chip.style.opacity = enabled ? '1' : '.4';
  chip.style.pointerEvents = enabled ? 'auto' : 'none';
}

export function selectVoice(id) {
  const voiceObj = availableVoices.find((v) => v.id === id);
  if (!voiceObj) return;
  selectedVoice = id;
  appSettings.voice = id;
  updateVoiceDisplay(voiceObj);
  saveSettings();
  syncTtsVoiceLang(id);
  closeVoiceDropdown();
  document.querySelectorAll('.voice-option').forEach((el) => {
    el.classList.toggle('active', el.dataset.voiceId === id);
  });
}

export async function loadVoices() {
  try {
    const response = await fetch('/api/voices');
    availableVoices = await response.json();
    voiceDropdownMenu.innerHTML = '';

    const addGroup = (label, voices) => {
      if (!voices.length) return;
      const grpLabel = document.createElement('div');
      grpLabel.className = 'voice-group-label';
      grpLabel.textContent = label;
      voiceDropdownMenu.appendChild(grpLabel);
      voices.forEach((v) => {
        const opt = document.createElement('div');
        opt.className = 'voice-option';
        opt.dataset.voiceId = v.id;
        opt.innerHTML = '<img class="flag-icon" src="flags/' + v.flag + '.svg" alt=""> <span>' + v.name + '</span>';
        opt.onclick = () => selectVoice(v.id);
        voiceDropdownMenu.appendChild(opt);
      });
    };

    addGroup('Google — Español', availableVoices.filter((v) => v.id.startsWith('es')));
    addGroup('Google — Otros idiomas', availableVoices.filter((v) => !v.id.startsWith('es')));

    const savedVoice = appSettings.voice;
    const found = savedVoice && availableVoices.find((v) => v.id === savedVoice);
    if (found) {
      updateVoiceDisplay(found);
      selectedVoice = savedVoice;
    } else {
      const firstEs = availableVoices.find((v) => v.id.startsWith('es'));
      if (firstEs) {
        updateVoiceDisplay(firstEs);
        selectedVoice = firstEs.id;
        // savedVoice era un id obsoleto (ej: 'es' de antes del rename a
        // 'es-MX') — corregir appSettings.voice tambien, no solo
        // selectedVoice, para que todo lo que lea appSettings.voice
        // directamente (ej: modal de idiomas permitidos) no se quede con
        // el valor legacy para siempre en localStorage.
        appSettings.voice = firstEs.id;
        saveSettings();
      }
    }
    if (selectedVoice) syncTtsVoiceLang(selectedVoice);

    document.querySelectorAll('.voice-option').forEach((el) => {
      el.classList.toggle('active', el.dataset.voiceId === selectedVoice);
    });
  } catch (err) {
    console.error('Error loading voices:', err);
  }
}

export async function testVoice() {
  const input = document.getElementById('testVoiceInput');
  const btn = document.getElementById('btnTestVoice');
  const text = input.value.trim() || 'Hola, esta es la voz seleccionada';
  const voiceId = voiceSelect.value || 'es';

  btn.disabled = true;
  btn.innerHTML = '<img class="icon-inline" src="icons/volume_up.svg" alt=""> Reproduciendo...';
  const done = () => { btn.disabled = false; btn.textContent = '▶ Probar'; };

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: voiceId }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = tErr(errData, null) || `Error ${res.status}`;
      showToast(`TTS: ${msg}`);
      done(); return;
    }
    const blob = await res.blob();
    if (blob.size < 100) {
      showToast(t('toast.ttsNetError'));
      done(); return;
    }
    playAudioBlob(blob, { onEnd: done, onError: done });
  } catch (err) {
    console.error('Test voice error:', err);
    showToast(t('toast.ttsFailed'));
    done();
  }
}

export function iniciarCierreDropdownVoces() {
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('voiceDropdown');
    if (dd && !dd.contains(e.target)) closeVoiceDropdown();
  });
}
