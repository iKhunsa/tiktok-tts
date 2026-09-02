import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';
import { fetchState } from './estado.js';

/** Unico punto de salida de comandos hacia el desktop (POST
 * /api/mobile/command). El desktop es la fuente de verdad: exito solo si
 * el servidor confirma que hay un desktop conectado que ejecutara el
 * comando — el estado mostrado se actualiza via state-sync de vuelta, no
 * optimistamente (por eso el fetchState() al final de cada rama). */
export function cmd(action, extra = {}) {
  fetch('/api/mobile/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
    .then((r) => r.json())
    .then((resp) => {
      if (!resp || resp.ok !== true) {
        if (resp && resp.reason === 'desktop-offline') {
          showToast(t('mobile3.openDesktop'));
        } else {
          showToast(t('mobile3.cmdFailed'));
        }
        fetchState();
        return;
      }
      const toasts = {
        skip: t('mobile3.msgSkipped'),
        clear: t('mobile3.queueCleared'),
        markClip: t('mobile3.clipMarked'),
        emergency: t('mobile3.emergencyMode'),
        soloChat: t('mobile3.onlyChatActivated'),
      };
      if (toasts[action]) showToast(toasts[action]);
      fetchState();
    })
    .catch(() => showToast(t('mobile3.connectionError')));
}
