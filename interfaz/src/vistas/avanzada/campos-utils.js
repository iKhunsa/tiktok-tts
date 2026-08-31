import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';

/** Lee un input numerico validando que sea entero; marca error visual y
 * muestra toast si no lo es. Devuelve null en caso de error (los callers
 * deben abortar el guardado). */
export function readIntField(id, label) {
  const el = document.getElementById(id);
  const value = parseInt(el.value, 10);
  if (!Number.isInteger(value)) {
    el.style.borderColor = '#e74c3c';
    el.focus();
    showToast(t('adv.invalidValue', { field: label }));
    return null;
  }
  el.style.borderColor = '';
  return value;
}

/** Feedback visual de "Guardado" en un boton de guardar, 2s. */
export function flashSave(btnId) {
  const btn = document.getElementById(btnId);
  const original = btn.textContent;
  btn.textContent = t('adv.saved');
  btn.classList.add('saved');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('saved');
  }, 2000);
}
