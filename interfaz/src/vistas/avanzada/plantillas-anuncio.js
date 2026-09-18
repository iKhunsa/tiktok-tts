import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { ANUNCIO_MAX_LEN, ANUNCIO_VARS, sanearPlantilla } from '../../nucleo/i18n/plantilla-anuncio.js';
import { showToast } from './toast.js';
import { flashSave } from './campos-utils.js';

// evento -> clave i18n del texto estandar (y de la etiqueta del campo)
const EVENTOS = { gift: 'Gift', giftUsd: 'GiftUsd', join: 'Join', follow: 'Follow', like: 'Like', share: 'Share' };
const TEXTO_ESTANDAR = { gift: 'gift', giftUsd: 'giftUsd', join: 'join', follow: 'follow', like: 'like', share: 'share' };
const VARS_ESTANDAR = { user: '{usuario}', count: '{cantidad}', gift: '{regalo}', amount: '{monto}' };

/** Dibuja los 6 campos; el placeholder es el texto estandar del idioma activo. */
export async function cargarPlantillas() {
  const box = document.getElementById('announceTplFields');
  if (!box) return;
  let guardadas = {};
  try {
    const cfg = await (await fetch('/api/config')).json();
    guardadas = cfg.announceTemplates || {};
  } catch (_) { showToast(t('adv.errorLoadConfig')); }
  box.textContent = '';
  for (const ev of Object.keys(EVENTOS)) {
    const wrap = document.createElement('div');
    wrap.className = 'control-group';
    const label = document.createElement('label');
    label.htmlFor = `announceTpl-${ev}`;
    label.textContent = t(`adv.announceTpl${EVENTOS[ev]}`);
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `announceTpl-${ev}`;
    input.dataset.evento = ev;
    input.maxLength = ANUNCIO_MAX_LEN;
    input.value = sanearPlantilla(guardadas[ev]);
    input.placeholder = t(`announce.${TEXTO_ESTANDAR[ev]}`, VARS_ESTANDAR);
    wrap.append(label, input);
    box.append(wrap);
  }
}

export async function saveAnnounceTemplates() {
  const announceTemplates = {};
  for (const input of document.querySelectorAll('#announceTplFields input')) {
    const ev = input.dataset.evento;
    const tpl = sanearPlantilla(input.value);
    // Variable desconocida para ese evento -> se marca y no se guarda nada.
    const desconocida = [...tpl.matchAll(/\{(\w+)\}/g)].some((m) => !ANUNCIO_VARS[ev].includes(m[1]));
    input.style.borderColor = desconocida ? '#e74c3c' : '';
    if (desconocida) { input.focus(); showToast(t('adv.invalidValue', { field: input.labels?.[0]?.textContent || ev })); return; }
    if (tpl) announceTemplates[ev] = tpl;
  }
  try {
    const res = await fetch('/api/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announceTemplates }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(tErr(data, 'adv.configRejected'));
    flashSave('btnSaveAnnounceTpl');
    showToast(t('adv.savedGeneral'));
  } catch (e) {
    showToast(e.message || t('adv.errorLoadConfig'));
  }
}
