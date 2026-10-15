import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

export function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => showToast(t('toast.clipboardCopied')))
    .catch(() => showToast(t('toast.copyError')));
}
