'use strict';

function getRequestHostname(hostHeader = '') {
  const raw = String(hostHeader || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.startsWith('[')) return raw.slice(1, raw.indexOf(']'));
  return raw.split(':')[0];
}

function isLocalHostname(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());
}

module.exports = { getRequestHostname, isLocalHostname };
