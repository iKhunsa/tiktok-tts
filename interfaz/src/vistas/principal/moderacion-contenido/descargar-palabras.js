// Descarga una lista de palabras como `<list>-words.json` (panel de Moderacion y popup de palabras).
export function descargarPalabras(list, words) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `${list}-words.json` });
  link.click();
  URL.revokeObjectURL(url);
}
