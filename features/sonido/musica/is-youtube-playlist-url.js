'use strict';

// True si el string es una URL de playlist de YouTube que hay que expandir
// (playlist?list=... o cualquier URL con ?list= SIN un ?v= puntual). Un
// enlace watch?v=XXX&list=YYY se trata como video suelto, no como playlist.
function isYoutubePlaylistUrl(str) {
  if (typeof str !== 'string') return false;
  if (!/youtube\.com|youtu\.be/i.test(str)) return false;
  if (/[?&]v=[A-Za-z0-9_-]{11}/.test(str)) return false;
  return /[?&]list=[A-Za-z0-9_-]+/.test(str) || /\/playlist\b/i.test(str);
}

module.exports = { isYoutubePlaylistUrl };
