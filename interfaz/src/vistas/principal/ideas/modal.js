import { showToast } from '../../../componentes/toast.js';
import { idiomaActual, t, tErr } from '../../../nucleo/i18n/i18n.js';

let submitting = false;

export function openIdeaModal() {
  const modal = document.getElementById('ideaModal');
  modal.classList.add('show');
  requestAnimationFrame(() => document.getElementById('ideaProblem').focus());
}

export function closeIdeaModal(event) {
  if (event && event.target.id !== 'ideaModal') return;
  document.getElementById('ideaModal').classList.remove('show');
}

export async function submitIdea(event) {
  event?.preventDefault();
  if (submitting) return;
  const fields = {
    problema: document.getElementById('ideaProblem').value.trim(), idea: document.getElementById('ideaDescription').value.trim(),
    audiencia: document.getElementById('ideaAudience').value, casoUso: document.getElementById('ideaUseCase').value.trim(),
    motivo: document.getElementById('ideaReason').value.trim(), appSimilar: document.getElementById('ideaSimilarApp').value.trim(),
  };
  if (!fields.problema || !fields.idea || !fields.audiencia || !fields.casoUso || !fields.motivo) {
    showToast(t('ideas.errorRequired'));
    return;
  }
  const button = document.getElementById('ideaSubmitBtn');
  submitting = true;
  button.disabled = true;
  button.textContent = t('ideas.sending');
  try {
    const appVersion = await window.electronAPI?.getAppVersion?.().catch(() => null);
    const response = await fetch('/api/ideas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, appVersion: appVersion || undefined, language: idiomaActual() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw data;
    document.getElementById('ideaForm').reset();
    closeIdeaModal();
    showToast(t('ideas.sent'));
  } catch (error) {
    showToast(tErr(error, 'ideas.errorSend'));
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = t('ideas.submit');
  }
}
