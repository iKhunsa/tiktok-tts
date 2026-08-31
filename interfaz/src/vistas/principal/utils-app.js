import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

export function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => showToast(t('toast.clipboardCopied')))
    .catch(() => showToast(t('toast.copyError')));
}

// Aviso: algunas secciones tienen bugs conocidos, arreglo en camino.
export function showKnownIssuesNotice() {
  showToast(t('overlayStr.knownBugsMsg'));
}
