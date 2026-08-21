'use strict';

function isPrivateIP(ip) {
  if (!ip) return false;
  const s = String(ip);
  return (
    s === '127.0.0.1' ||
    s === '::1' ||
    /^10\./.test(s) ||
    /^192\.168\./.test(s) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(s)
  );
}

module.exports = { isPrivateIP };
