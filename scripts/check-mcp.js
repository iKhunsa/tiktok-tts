'use strict';

// Pre-check rápido (corre en `npm test` vía test/mcp-registry.test.js, y también
// standalone): todo features/<x>/index.js que monte rutas de escritura debe
// registrar al menos una tool MCP. Ver features/mcp/PROTOCOL.md.

const fs = require('fs');
const path = require('path');

const FEATURES_DIR = path.join(__dirname, '..', 'features');
const ESCRITURA = /\bapp\.(post|patch|delete|put)\s*\(/;
const REGISTRA_TOOL = /mcpRegistry\.registerTool\s*\(|mcp\.registerTool\s*\(/;

// Dominios exentos, con justificación:
//  - chat: su lectura la sirve get_recent_chat (dominio mcp); no expone acciones.
//  - reporte-bug: POST /api/report-bug hace un post externo a Discord "en nombre
//    del usuario" — no es una acción que un agente deba disparar solo. El panel
//    MCP tiene un botón manual para eso (Fase 5).
const EXENTOS = new Set(['chat', 'reporte-bug']);

function check() {
  const problemas = [];
  for (const dom of fs.readdirSync(FEATURES_DIR)) {
    if (EXENTOS.has(dom)) continue;
    const idx = path.join(FEATURES_DIR, dom, 'index.js');
    if (!fs.existsSync(idx)) continue;
    const src = fs.readFileSync(idx, 'utf8');
    if (ESCRITURA.test(src) && !REGISTRA_TOOL.test(src)) {
      problemas.push(dom);
    }
  }
  return problemas;
}

if (require.main === module) {
  const problemas = check();
  if (problemas.length) {
    console.error(`\n[check-mcp] dominios con rutas de escritura sin mcp.registerTool: ${problemas.join(', ')}`);
    console.error('Registrá una tool en su register() o agregá el dominio a EXENTOS con justificación.\n');
    process.exit(1);
  }
  console.log('[check-mcp] ok');
}

module.exports = { check };
