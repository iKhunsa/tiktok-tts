'use strict';

// Convierte el subset de JSON Schema que usan las tools (objeto con properties
// de tipos primitivos/array + required) al "raw shape" de Zod que
// McpServer.registerTool espera como inputSchema.
//
// Los dominios NUNCA tocan Zod: su inputSchema es JSON Schema plano (portable,
// se guarda una sola vez, se sirve tal cual a la UI de la tienda). Este adapter
// es el único lugar del código que conoce Zod.

const { z } = require('zod');

function propAZod(def) {
  let base;
  switch (def && def.type) {
    case 'string':  base = z.string(); break;
    case 'number':  base = z.number(); break;
    case 'integer': base = z.number().int(); break;
    case 'boolean': base = z.boolean(); break;
    case 'array':   base = z.array(def.items ? propAZod(def.items) : z.any()); break;
    case 'object':  base = z.object({}).passthrough(); break;
    default:        base = z.any();
  }
  if (def && def.description) base = base.describe(def.description);
  return base;
}

/**
 * @param {{type:'object', properties?:object, required?:string[]}} schema
 * @returns {Record<string, import('zod').ZodTypeAny>}  raw shape para registerTool
 */
function jsonSchemaToZodShape(schema) {
  const props = (schema && schema.properties) || {};
  const required = new Set((schema && schema.required) || []);
  const shape = {};
  for (const [key, def] of Object.entries(props)) {
    const zType = propAZod(def);
    shape[key] = required.has(key) ? zType : zType.optional();
  }
  return shape;
}

module.exports = { jsonSchemaToZodShape };
