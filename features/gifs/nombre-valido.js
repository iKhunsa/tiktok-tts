'use strict';

/** Nombre de GIF o carpeta: sin espacios sobrantes, entre 1 y 60 caracteres. null si no sirve. */
function nombreValido(texto, max = 60) {
  if (typeof texto !== 'string') return null;
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio && limpio.length <= max ? limpio : null;
}

module.exports = { nombreValido };
