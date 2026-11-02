import { showToast } from '../../../componentes/toast.js';
import { aplicarTraducciones, idiomaActual, t, tErr } from '../../../nucleo/i18n/i18n.js';

const MAX_IMAGEN_BYTES = 8 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

let submitting = false;
let opener = null;
let closeTimer = null;
let urlVistaPrevia = null;

function updateCounters() {
  document.querySelectorAll('[data-counter-for]').forEach((counter) => {
    const field = document.getElementById(counter.dataset.counterFor);
    counter.textContent = t('ideas.charCount', { count: field.value.length, max: field.maxLength });
  });
}

/** Sin argumento abre la sugerencia general; con 'overlay', el formulario de ideas de overlay. */
export function openIdeaModal(tipo) {
  const modal = document.getElementById('ideaModal');
  const esOverlay = tipo === 'overlay';
  clearTimeout(closeTimer);
  opener = document.activeElement;
  modal.classList.remove('closing');
  document.getElementById('ideaForm').hidden = esOverlay;
  document.getElementById('overlayIdeaForm').hidden = !esOverlay;
  document.getElementById('ideaThanks').hidden = true;
  document.getElementById('ideaModalTitleText').dataset.i18n = esOverlay ? 'ideas.overlayTitle' : 'ideas.title';
  document.getElementById('ideaModalSubtitle').dataset.i18n = esOverlay ? 'ideas.overlaySubtitle' : 'ideas.subtitle';
  aplicarTraducciones(modal);
  updateCounters();
  modal.classList.add('show');
  requestAnimationFrame(() => document.getElementById(esOverlay ? 'overlayIdeaText' : 'ideaProblem').focus());
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

async function enviar(form, button, url, crearPeticion) {
  submitting = true;
  button.disabled = true;
  button.innerHTML = `<span class="idea-submit-spinner" aria-hidden="true"></span>${t('ideas.sending')}`;
  try {
    const appVersion = await window.electronAPI?.getAppVersion?.().catch(() => null);
    const response = await fetch(url, { method: 'POST', ...crearPeticion(appVersion || undefined) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw data;
    form.reset();
    quitarImagenOverlay();
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

export async function submitIdea(event) {
  event?.preventDefault();
  if (submitting) return;
  const form = document.getElementById('ideaForm');
  if (!form.reportValidity()) return;
  const fields = {
    problema: document.getElementById('ideaProblem').value.trim(), idea: document.getElementById('ideaDescription').value.trim(),
    appSimilar: document.getElementById('ideaSimilarApp').value.trim(),
    discord: document.getElementById('ideaDiscord').value.trim(), email: document.getElementById('ideaEmail').value.trim(),
  };
  if (!fields.problema || !fields.idea) {
    showToast(t('ideas.errorRequired'));
    return;
  }
  await enviar(form, document.getElementById('ideaSubmitBtn'), '/api/ideas', (appVersion) => ({
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...fields, appVersion, language: idiomaActual() }),
  }));
}

export async function submitOverlayIdea(event) {
  event?.preventDefault();
  if (submitting) return;
  const form = document.getElementById('overlayIdeaForm');
  if (!form.reportValidity()) return;
  const idea = document.getElementById('overlayIdeaText').value.trim();
  const discord = document.getElementById('overlayIdeaDiscord').value.trim();
  const email = document.getElementById('overlayIdeaEmail').value.trim();
  if (!idea || (!discord && !email)) {
    showToast(t('errors.overlayIdeaRequired'));
    return;
  }
  const imagen = document.getElementById('overlayIdeaImage').files[0];
  await enviar(form, document.getElementById('overlayIdeaSubmitBtn'), '/api/ideas/overlay', (appVersion) => {
    const body = new FormData();
    body.append('idea', idea);
    body.append('referencia', document.getElementById('overlayIdeaLink').value.trim());
    body.append('discord', discord);
    body.append('email', email);
    body.append('language', idiomaActual());
    if (appVersion) body.append('appVersion', appVersion);
    if (imagen) body.append('imagen', imagen);
    return { body };
  });
}

export function quitarImagenOverlay() {
  if (urlVistaPrevia) URL.revokeObjectURL(urlVistaPrevia);
  urlVistaPrevia = null;
  document.getElementById('overlayIdeaImage').value = '';
  document.getElementById('overlayIdeaDrop').hidden = false;
  document.getElementById('overlayIdeaPreview').hidden = true;
}

function mostrarImagenOverlay(input) {
  const imagen = input.files[0];
  if (!imagen) return quitarImagenOverlay();
  // Soltar un archivo sobre el input se salta el filtro de accept.
  if (!TIPOS_IMAGEN.includes(imagen.type) || imagen.size > MAX_IMAGEN_BYTES) {
    showToast(t('errors.overlayIdeaImage'));
    return quitarImagenOverlay();
  }
  if (urlVistaPrevia) URL.revokeObjectURL(urlVistaPrevia);
  urlVistaPrevia = URL.createObjectURL(imagen);
  document.querySelector('#overlayIdeaPreview img').src = urlVistaPrevia;
  document.getElementById('overlayIdeaDrop').hidden = true;
  document.getElementById('overlayIdeaPreview').hidden = false;
}

document.addEventListener('input', (event) => {
  if (event.target.matches('#ideaProblem, #ideaDescription, #overlayIdeaText')) updateCounters();
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'overlayIdeaImage') mostrarImagenOverlay(event.target);
});
