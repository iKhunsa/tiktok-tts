'use strict';

// Saca rutas de home de mensajes/props antes de mandarlos afuera — ni
// GlitchTip ni Aptabase ni telemetria las sanean y expondrían el nombre de
// usuario de Windows. Cruza el límite electron-shell/ ↔ features/ (lo usan
// glitchtip.js, aptabase.js y features/telemetria/) → vive en core/.
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
