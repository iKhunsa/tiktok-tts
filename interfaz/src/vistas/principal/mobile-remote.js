import { copyToClipboard } from './utils-app.js';

let _mobileURL = '';

export function loadMobileURL() {
  fetch('/api/local-ip').then((r) => r.json()).then(({ ip, port }) => {
    _mobileURL = `http://${ip}:${port}/mobile`;
    const el = document.getElementById('mobileURL');
    if (el) el.textContent = _mobileURL;
  }).catch(() => {});
}

export function copyMobileURL() { if (_mobileURL) copyToClipboard(_mobileURL); }

export function refreshMobileQR() {
  loadMobileURL();
  const img = document.getElementById('mobileQR');
  if (img) img.src = '/api/mobile/qr?t=' + Date.now();
}
