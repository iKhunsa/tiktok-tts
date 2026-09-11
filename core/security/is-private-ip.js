'use strict';

function isPrivateIP(ip) {
  if (!ip) return false;
  const s = String(ip).toLowerCase();
  return (
    s === '127.0.0.1' ||
    s === '::1' ||
    /^10\./.test(s) ||
    /^192\.168\./.test(s) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(s) ||
    /^f[cd][0-9a-f]{0,2}:/.test(s) ||
    /^fe[89ab][0-9a-f]:/.test(s)
  );
}

module.exports = { isPrivateIP };
