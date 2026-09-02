import { appSettings } from '../../nucleo/estado/ajustes-app.js';
import { allowedExtraLangs, setAllowedExtraLang as setAllowedExtraLangRemoto } from '../../nucleo/estado/config-runtime.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { switchView } from './vistas-router.js';
import { driverTourDefaults } from './tours/index.js';
import { spCancelCapture, spResetDeleteBtn } from './soundpad.js';

export function setStatus(type, text) {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusText');
  if (!dot || !label) return;
  dot.className = 'status-dot' + (type ? ` ${type}` : '');
  label.className = 'status-text' + (type ? ` ${type}` : '');
  label.textContent = text;
}

export function openDonationsModal() { document.getElementById('donationsModal').classList.add('show'); }
export function closeDonationsModal(e) {
  if (e && e.target.id !== 'donationsModal') return;
  document.getElementById('donationsModal').classList.remove('show');
}

export function openSocialModal() { document.getElementById('socialModal').classList.add('show'); }
export function closeSocialModal(e) {
  if (e && e.target.id !== 'socialModal') return;
  document.getElementById('socialModal').classList.remove('show');
}

export function openBugReportModal() { document.getElementById('bugReportModal').classList.add('show'); }
export function closeBugReportModal(e) {
  if (e && e.target.id !== 'bugReportModal') return;
  document.getElementById('bugReportModal').classList.remove('show');
}

let _bugReportSubmitting = false;
export async function submitBugReport() {
  if (_bugReportSubmitting) return;
  const discordNick = document.getElementById('bugReportDiscordNick').value.trim();
  const channelLink = document.getElementById('bugReportChannelLink').value.trim();
  const description = document.getElementById('bugReportDescription').value.trim();
  const extra = document.getElementById('bugReportExtra').value.trim();

  if (!discordNick || !channelLink || !description) {
    showToast(t('bugReport.errorRequired'));
    return;
  }

  const btn = document.getElementById('bugReportSubmitBtn');
  _bugReportSubmitting = true;
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = t('bugReport.sending');

  try {
    const appVersion = window.electronAPI?.getAppVersion
      ? await window.electronAPI.getAppVersion().catch(() => null)
      : null;
    const res = await fetch('/api/report-bug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordNick, channelLink, description, extra: extra || undefined, appVersion: appVersion || undefined }),
    });
    if (!res.ok) throw new Error('report-bug failed');
    showToast(t('bugReport.sent'));
    document.getElementById('bugReportDescription').value = '';
    document.getElementById('bugReportExtra').value = '';
    closeBugReportModal();
  } catch (e) {
    showToast(t('bugReport.errorSend'));
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalText;
      _bugReportSubmitting = false;
    }, 3000);
  }
}

// Palabra conectora hablada entre el nombre de usuario y el comentario
// (ej: "Usuario dice: comentario"). Independiente de VOICE_TO_DICT_LANG_UI:
// aca si cubrimos ja/zh-CN/ru/ko porque es una palabra hablada, no un
// filtro de alfabeto.
const SAY_USERNAME_CONNECTOR_WORD = {
  'es-MX': 'dice:', en: 'says:', 'en-GB': 'says:', pt: 'diz:', 'pt-PT': 'diz:',
  fr: 'dit:', de: 'sagt:', it: 'dice:', ja: 'さん:', 'zh-CN': '说:', ru: 'говорит:', ko: '님:',
};
const DEFAULT_CONNECTOR_WORD = 'says:';

export function getSayUsernameConnector() {
  if (!appSettings.sayUsernameConnector) return null;
  return SAY_USERNAME_CONNECTOR_WORD[appSettings.voice] || DEFAULT_CONNECTOR_WORD;
}

// Modal "Idiomas permitidos" (filtro por diccionario de palabras). Espejo
// del VOICE_TO_DICT_LANG del servidor: voces ru/ja/zh/ko no aplican.
const VOICE_TO_DICT_LANG_UI = {
  'es-MX': 'es', en: 'en', 'en-GB': 'en', pt: 'pt', 'pt-PT': 'pt', fr: 'fr', de: 'de', it: 'it',
};
const DICT_LANG_NAMES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano' };

export function openDictLangModal() {
  renderDictLangModal();
  document.getElementById('dictLangModal').classList.add('show');
}
export function closeDictLangModal(e) {
  if (e && e.target.id !== 'dictLangModal') return;
  document.getElementById('dictLangModal').classList.remove('show');
}

function renderDictLangModal() {
  const voiceLang = VOICE_TO_DICT_LANG_UI[appSettings.voice] || null;
  const list = document.getElementById('dictLangList');
  const na = document.getElementById('dictLangNA');
  list.innerHTML = '';
  na.style.display = voiceLang ? 'none' : 'block';
  if (!voiceLang) return;
  for (const lang of Object.keys(DICT_LANG_NAMES)) {
    const isVoice = lang === voiceLang;
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;background:rgba(255,255,255,0.05);cursor:pointer;margin-bottom:6px;font-size:14px;' + (isVoice ? 'opacity:0.6;cursor:default;' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isVoice || allowedExtraLangs.includes(lang);
    cb.disabled = isVoice;
    if (!isVoice) cb.onchange = () => setAllowedExtraLang(lang, cb.checked);
    const span = document.createElement('span');
    span.textContent = DICT_LANG_NAMES[lang] + (isVoice ? ' ' + t('dictLang.voiceAlways') : '');
    label.append(cb, span);
    list.appendChild(label);
  }
}

// allowedExtraLangs ya no pasa por appSettings/localStorage (fase-05):
// config-runtime.js es el unico dueño, ver nucleo/estado/config-runtime.js.
function setAllowedExtraLang(lang, enabled) {
  setAllowedExtraLangRemoto(lang, enabled);
}

export function closeDonationNotice(e) {
  if (e && e.target.id !== 'donationNoticeModal') return;
  document.getElementById('donationNoticeModal').classList.remove('show');
}
export function openDonationsFromNotice() {
  document.getElementById('donationNoticeModal').classList.remove('show');
  openDonationsModal();
}

export function closeBugReportNotice(e) {
  if (e && e.target.id !== 'bugReportNoticeModal') return;
  document.getElementById('bugReportNoticeModal').classList.remove('show');
  maybeShowDonationNotice();
}

export function openBugReportFromNotice() {
  document.getElementById('bugReportNoticeModal').classList.remove('show');
  maybeShowDonationNotice();
  if (window.driver && window.driver.js) {
    window.driver.js.driver({
      ...driverTourDefaults(),
      showProgress: false,
      steps: [{
        element: '#sidebarBugReportBtn',
        popover: { title: t('bugReport.tourTitle'), description: t('bugReport.tourDesc'), side: 'right', align: 'start' },
      }],
    }).drive();
  } else {
    openBugReportModal();
  }
}

// ─── Onboarding: tutorial guiado para usuarios que nunca usaron la app ──
export function closeOnboardingWelcome(e) {
  if (e && e.target.id !== 'onboardingWelcomeModal') return;
  document.getElementById('onboardingWelcomeModal').classList.remove('show');
  maybeShowBugReportNotice();
}

function fireConfetti() {
  if (!window.confetti) return;
  const duration = 1800;
  const end = Date.now() + duration;
  (function frame() {
    window.confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#F0213A', '#00c573', '#F2F2F2'] });
    window.confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#F0213A', '#00c573', '#F2F2F2'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  window.confetti({ particleCount: 90, spread: 100, origin: { y: 0.4 }, colors: ['#F0213A', '#00c573', '#F2F2F2'] });
}

function showOnboardingComplete() {
  document.getElementById('onboardingCompleteModal').classList.add('show');
  fireConfetti();
}

export function closeOnboardingComplete(e) {
  if (e && e.target.id !== 'onboardingCompleteModal') return;
  document.getElementById('onboardingCompleteModal').classList.remove('show');
  maybeShowBugReportNotice();
}

export function startOnboardingTour() {
  document.getElementById('onboardingWelcomeModal').classList.remove('show');
  if (!(window.driver && window.driver.js)) { maybeShowDonationNotice(); return; }

  const openChannelForm = () => {
    switchView('settings');
    const form = document.getElementById('add-channel-form');
    if (form) form.style.display = 'flex';
  };

  window.driver.js.driver({
    ...driverTourDefaults(),
    onDestroyStarted: (element, step, opts) => {
      opts.driver.destroy();
      showOnboardingComplete();
    },
    steps: [
      { element: '#navSettingsBtn', popover: { title: t('onboarding.step1Title'), description: t('onboarding.step1Desc'), side: 'right', align: 'start' }, onHighlightStarted: () => switchView('settings') },
      { element: '#btn-toggle-add-channel', popover: { title: t('onboarding.step2Title'), description: t('onboarding.step2Desc'), side: 'bottom', align: 'end' }, onHighlightStarted: () => switchView('settings') },
      { element: '#platform-seg', popover: { title: t('onboarding.step3Title'), description: t('onboarding.step3Desc'), side: 'bottom', align: 'start' }, onHighlightStarted: openChannelForm },
      { element: '#add-channel-input', popover: { title: t('onboarding.step4Title'), description: t('onboarding.step4Desc'), side: 'bottom', align: 'start' }, onHighlightStarted: openChannelForm },
      { element: '#btn-add-channel', popover: { title: t('onboarding.step5Title'), description: t('onboarding.step5Desc'), side: 'bottom', align: 'start' }, onHighlightStarted: openChannelForm },
      { element: '#btn-connect-all-chat', popover: { title: t('onboarding.step6Title'), description: t('onboarding.step6Desc'), side: 'top', align: 'end' }, onHighlightStarted: () => switchView('chat') },
    ],
  }).drive();
}

// Aviso one-time: bienvenida y tutorial guiado (v1.6.0)
const ONBOARDING_KEY = 'tikliveTTS_onboardingSeen_v1';
function maybeShowOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) { maybeShowDonationNotice(); return; }
  localStorage.setItem(ONBOARDING_KEY, '1');
  setTimeout(() => document.getElementById('onboardingWelcomeModal').classList.add('show'), 900);
}

// Aviso one-time: nuevas opciones de donacion (v1.5.2). Va AL FINAL de toda
// la cadena de popups (onboarding -> bug report -> donacion) para no
// competir visualmente con los tutoriales/avisos anteriores.
const DONATION_NOTICE_KEY = 'tikliveTTS_noticeDonations_v1';
function maybeShowDonationNotice() {
  if (localStorage.getItem(DONATION_NOTICE_KEY)) return;
  localStorage.setItem(DONATION_NOTICE_KEY, '1');
  setTimeout(() => document.getElementById('donationNoticeModal').classList.add('show'), 900);
}

// Aviso one-time: boton de Reportar Bug (v1.6.0)
const BUG_REPORT_NOTICE_KEY = 'tikliveTTS_noticeBugReport_v1';
function maybeShowBugReportNotice() {
  if (localStorage.getItem(BUG_REPORT_NOTICE_KEY)) { maybeShowDonationNotice(); return; }
  localStorage.setItem(BUG_REPORT_NOTICE_KEY, '1');
  setTimeout(() => document.getElementById('bugReportNoticeModal').classList.add('show'), 600);
}

export function iniciarModalesYAvisos() {
  // Espera a que el idioma este definido (elegido o cargado) antes de
  // mostrar cualquier popup, para que todo aparezca ya traducido.
  Promise.resolve(window.__langReady).then(maybeShowOnboarding);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('donationsModal').classList.remove('show');
      document.getElementById('socialModal').classList.remove('show');
      document.getElementById('donationNoticeModal').classList.remove('show');
      document.getElementById('dictLangModal').classList.remove('show');
      document.getElementById('bugReportModal').classList.remove('show');
      document.getElementById('bugReportNoticeModal').classList.remove('show');
      document.getElementById('onboardingWelcomeModal').classList.remove('show');
      document.getElementById('onboardingCompleteModal').classList.remove('show');
      document.getElementById('modWipeConfirmModal').classList.remove('show');
      spCancelCapture();
      spResetDeleteBtn();
      document.getElementById('spSettingsModal').classList.remove('show');
    }
  });
}
