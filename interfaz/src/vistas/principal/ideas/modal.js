import { showToast } from '../../../componentes/toast.js';
import { idiomaActual, t, tErr } from '../../../nucleo/i18n/i18n.js';

let submitting = false;
let opener = null;
let closeTimer = null;

function updateCounters() {
  document.querySelectorAll('[data-counter-for]').forEach((counter) => {
    const field = document.getElementById(counter.dataset.counterFor);
    counter.textContent = t('ideas.charCount', { count: field.value.length, max: field.maxLength });
  });
}

export function openIdeaModal() {
  const modal = document.getElementById('ideaModal');
  clearTimeout(closeTimer);
  opener = document.activeElement;
  modal.classList.remove('closing');
  document.getElementById('ideaForm').hidden = false;
  document.getElementById('ideaThanks').hidden = true;
  updateCounters();
  modal.classList.add('show');
  requestAnimationFrame(() => document.getElementById('ideaProblem').focus());
}

export function closeIdeaModal(event) {
  if (event && event.target.id !== 'ideaModal') return;
  const modal = document.getElementById('ideaModal');
  if (!modal.classList.contains('show') || modal.classList.contains('closing')) return;
  clearTimeout(closeTimer);
  modal.classList.add('closing');
  const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduce-motion') ? 0 : 150;
  setTimeout(() => {
    modal.classList.remove('show', 'closing');
    opener?.focus?.();
    opener = null;
  }, delay);
}

export async function submitIdea(event) {
  event?.preventDefault();
  if (submitting) return;
  const form = document.getElementById('ideaForm');
  if (!form.reportValidity()) return;
  const fields = {
    problema: document.getElementById('ideaProblem').value.trim(), idea: document.getElementById('ideaDescription').value.trim(),
    audiencia: document.querySelector('[name="ideaAudience"]:checked')?.value, casoUso: document.getElementById('ideaUseCase').value.trim(),
    motivo: document.getElementById('ideaReason').value.trim(), appSimilar: document.getElementById('ideaSimilarApp').value.trim(),
  };
  if (!fields.problema || !fields.idea || !fields.audiencia || !fields.casoUso || !fields.motivo) {
    showToast(t('ideas.errorRequired'));
    return;
  }
  const button = document.getElementById('ideaSubmitBtn');
  submitting = true;
  button.disabled = true;
  button.innerHTML = `<span class="idea-submit-spinner" aria-hidden="true"></span>${t('ideas.sending')}`;
  try {
    const appVersion = await window.electronAPI?.getAppVersion?.().catch(() => null);
    const response = await fetch('/api/ideas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, appVersion: appVersion || undefined, language: idiomaActual() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw data;
    form.reset();
    form.hidden = true;
    document.getElementById('ideaThanks').hidden = false;
    closeTimer = setTimeout(() => closeIdeaModal(), 1400);
  } catch (error) {
    showToast(tErr(error, 'ideas.errorSend'));
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = t('ideas.submit');
  }
}

document.addEventListener('input', (event) => {
  if (event.target.matches('#ideaProblem, #ideaDescription')) updateCounters();
});
