import { copyToClipboard } from './utils-app.js';

let _mobileURL = '';

export function loadMobileURL() {
  fetch('/api/local-ip').then(async (r) => {
    const data = await r.json().catch(() => ({}));
    const port = Number(data.port);
    if (!r.ok || typeof data.ip !== 'string' || !data.ip || !Number.isInteger(port) || port < 1 || port > 65535) {
      showMobileUpgrade();
      return;
    }
    _mobileURL = `http://${data.ip}:${port}/mobile`;
    const el = document.getElementById('mobileURL');
    if (el) el.textContent = _mobileURL;
    document.getElementById('mobileCopyBtn')?.removeAttribute('hidden');
  }).catch(() => {});
}

export function copyMobileURL() { if (_mobileURL) copyToClipboard(_mobileURL); }

export function showMobileQRPlaceholder() {
  const img = document.getElementById('mobileQR');
  if (img && !img.dataset.placeholder) {
    img.dataset.placeholder = 'true';
    img.src = '/img/mobile-qr-placeholder.svg';
  }
}

export function showMobileUpgrade() {
  _mobileURL = '';
  document.getElementById('mobileCopyBtn')?.setAttribute('hidden', '');
  showMobileQRPlaceholder();
}

export function refreshMobileQR() {
  loadMobileURL();
  const img = document.getElementById('mobileQR');
  if (img) {
    delete img.dataset.placeholder;
    img.src = '/api/mobile/qr?t=' + Date.now();
  }
}
