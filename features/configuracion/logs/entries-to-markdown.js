'use strict';

/**
 * Formatea las entradas de log de la sesion actual (ver
 * read-session-log-entries.js) como Markdown legible, para adjuntar a un
 * reporte de bug o revisar a mano. Una linea por entrada; el nivel y el
 * dominio quedan como prefijo para poder buscar/filtrar visualmente.
 */
function entriesToMarkdown(entries) {
  if (!entries.length) return '_(sin entradas de log en esta sesion)_\n';

  const lineas = ['# Log de sesion', ''];
  for (const entry of entries) {
    const nivel = (entry.level || 'info').toUpperCase();
    const dominio = entry.domain || '?';
    const fn = entry.function ? ` \`${entry.function}\`` : '';
    lineas.push(`- **[${nivel}]** \`${entry.ts || ''}\` (${dominio})${fn} — ${entry.event || ''}: ${entry.message || ''}`);
    if (entry.data !== undefined) {
      lineas.push('  ```json');
      lineas.push('  ' + JSON.stringify(entry.data));
      lineas.push('  ```');
    }
    if (entry.stack) {
      lineas.push('  <details><summary>stack</summary>\n\n  ```\n  ' + String(entry.stack).replace(/\n/g, '\n  ') + '\n  ```\n\n  </details>');
    }
  }
  return lineas.join('\n') + '\n';
}

module.exports = { entriesToMarkdown };
