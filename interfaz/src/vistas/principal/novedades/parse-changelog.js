const ENCABEZADO_VERSION = /^## \[([^\]]+)\]\s*(?:—\s*(\S+))?\s*(?:\(([^)]+)\))?/;

/**
 * CHANGELOG.md (Keep a Changelog) → [{ version, fecha, etiqueta, secciones: [{ titulo, items }] }].
 * Una viñeta puede continuar en las líneas siguientes indentadas; las
 * sub-viñetas se aplanan como ítems propios.
 */
export function parsearChangelog(texto) {
  const versiones = [];
  let version = null;
  let seccion = null;
  let enItem = false;

  for (const linea of texto.split(/\r?\n/)) {
    const encabezado = ENCABEZADO_VERSION.exec(linea);
    if (encabezado) {
      version = { version: encabezado[1], fecha: encabezado[2] || '', etiqueta: encabezado[3] || '', secciones: [] };
      versiones.push(version);
      seccion = null;
      enItem = false;
    } else if (version && linea.startsWith('### ')) {
      seccion = { titulo: linea.slice(4).trim(), items: [] };
      version.secciones.push(seccion);
      enItem = false;
    } else if (seccion && /^\s*[-*] /.test(linea)) {
      seccion.items.push(linea.replace(/^\s*[-*] /, '').trim());
      enItem = true;
    } else if (seccion && enItem && /^\s+\S/.test(linea)) {
      seccion.items[seccion.items.length - 1] += ` ${linea.trim()}`;
    }
  }
  return versiones;
}
