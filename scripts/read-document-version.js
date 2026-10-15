// Lee "**Version del documento:** X" / "**Document version:** X" de la
// cabecera de los textos legales (docs/legal/*.md).
'use strict';

const VERSION_LINE = /\*\*(?:Versión del documento|Document version):\*\*\s*([0-9][0-9.]*)/;

function readDocumentVersion(markdown) {
  const match = VERSION_LINE.exec(markdown);
  if (!match) throw new Error('El documento legal no declara "Versión del documento"');
  return match[1];
}

module.exports = { readDocumentVersion };
