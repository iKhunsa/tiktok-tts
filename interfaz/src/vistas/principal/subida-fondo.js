import { appSettings, saveSettings } from '../../nucleo/estado/ajustes-app.js';
import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { updateOverlayUrl, updateSocialOverlayUrl } from './configurador-overlays.js';

export async function uploadBg(type, file) {
  if (!file) return;
  const oldUrl = appSettings.overlays[type].bgimg;
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await fetch('/api/upload-bg', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) {
      appSettings.overlays[type].bgimg = data.url;
      updateBgPreview(type, data.url);
      if (type === 'alertas-social') updateSocialOverlayUrl();
      else updateOverlayUrl(type);
      saveSettings();
      showToast(t('toast.bgUploaded'));
      if (oldUrl && oldUrl !== data.url) {
        const oldFilename = oldUrl.split('/').pop();
        fetch('/api/upload-bg', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: oldFilename }),
        }).catch(() => { /* ignore cleanup errors */ });
      }
    } else {
      showToast(tErr(data, 'toast.bgUploadError'));
    }
  } catch (e) {
    showToast(t('toast.bgUploadError'));
  }
}

export async function removeBg(type) {
  const url = appSettings.overlays[type].bgimg;
  if (url) {
    const filename = url.split('/').pop();
    try {
      await fetch('/api/upload-bg', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
    } catch (e) { /* ignore cleanup errors */ }
  }
  appSettings.overlays[type].bgimg = '';
  const input = document.getElementById('cfg-' + type + '-bgimg');
  if (input) input.value = '';
  updateBgPreview(type, '');
  if (type === 'alertas-social') updateSocialOverlayUrl();
  else updateOverlayUrl(type);
  saveSettings();
}

export function updateBgPreview(type, url) {
  const preview = document.getElementById('cfg-' + type + '-bgimg-preview');
  const removeBtn = document.getElementById('cfg-' + type + '-bgimg-remove');
  if (preview) {
    preview.src = url || '';
    preview.classList.toggle('visible', !!url);
  }
  if (removeBtn) removeBtn.style.display = url ? '' : 'none';
}
