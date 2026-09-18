import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { ANUNCIO_MAX_LEN, sanearPlantilla } from '../../nucleo/i18n/plantilla-anuncio.js';
import { applyAnnounceTemplates } from '../../nucleo/estado/config-runtime.js';
import { showToast } from '../../componentes/toast.js';

// evento -> sufijo de las claves i18n (etiqueta y ejemplo). giftUsd no tiene campo:
// el monto se agrega solo a la frase de "gift".
const EVENTOS = { gift: 'Gift', join: 'Join', follow: 'Follow', like: 'Like', share: 'Share' };

/** Dibuja los campos de frase; guardan solos al salir del campo (como el resto de Configuracion TTS). */
export async function cargarPlantillas() {
  const box = document.getElementById('announceTplFields');
  if (!box) return;
  let guardadas = {};
  try {
    guardadas = (await (await fetch('/api/config')).json()).announceTemplates || {};
  } catch (_) { /* sin config: campos vacios */ }
  box.textContent = '';
  for (const ev of Object.keys(EVENTOS)) {
    const wrap = document.createElement('div');
    wrap.className = 'setting-group';
    const label = document.createElement('label');
    label.htmlFor = `announceTpl-${ev}`;
    label.textContent = t(`settings.announceTpl${EVENTOS[ev]}`);
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `announceTpl-${ev}`;
    input.dataset.evento = ev;
    input.maxLength = ANUNCIO_MAX_LEN;
    input.value = sanearPlantilla(guardadas[ev]);
    input.placeholder = t(`settings.announceTplEx${EVENTOS[ev]}`);
    input.addEventListener('change', saveAnnounceTemplates);
    wrap.append(label, input);
    box.append(wrap);
  }
}

async function saveAnnounceTemplates() {
  const announceTemplates = {};
  for (const input of document.querySelectorAll('#announceTplFields input')) {
    const tpl = sanearPlantilla(input.value);
    if (tpl) announceTemplates[input.dataset.evento] = tpl;
  }
  try {
    const res = await fetch('/api/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announceTemplates }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(tErr(data, 'adv.configRejected'));
    applyAnnounceTemplates({ announceTemplates });
  } catch (e) {
    showToast(e.message || t('adv.errorLoadConfig'));
  }
}
