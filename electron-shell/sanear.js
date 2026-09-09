'use strict';

// Saca rutas de home de mensajes/props antes de mandarlos afuera — ni
// GlitchTip ni Aptabase las sanean y expondrían el nombre de usuario de
// Windows. Compartido por glitchtip.js y aptabase.js.
function sanear(str) {
  if (!str) return str;
  let s = String(str);
  const ud = process.env.TIKTOK_USER_DATA_PATH;
  if (ud) s = s.split(ud).join('<userData>');
  s = s.replace(/[A-Za-z]:\\Users\\[^\\/:*?"<>|\r\n]+/g, 'C:\\Users\\<user>');
  s = s.replace(/\/(?:home|Users)\/[^/\s]+/g, '/home/<user>');
  return s;
}

module.exports = { sanear };
