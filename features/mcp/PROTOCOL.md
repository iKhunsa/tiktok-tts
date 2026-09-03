# MCP — protocolo y versionado

## Versión de protocolo

- SDK: `@modelcontextprotocol/sdk` pinneado en `package.json` (`^1.30.0`).
- Versión de protocolo MCP negociada por el SDK: **`2025-06-18`**
  (hardcodeada en `features/mcp/tools/health.js#PROTOCOL_VERSION` y devuelta por
  la tool `health` + `GET /api/mcp/info`).
- Al bumpear el SDK: verificar que `initialize` sigue negociando la misma
  versión (o actualizar `PROTOCOL_VERSION` y este doc), correr el cliente MCP
  falso del scratchpad, y `npm test`.

## Estabilidad de schema de tools

Los agentes dependen de que los nombres y schemas de las tools no cambien de
forma incompatible entre releases de la app.

**Permitido en patch/minor (no rompe agentes):**
- Agregar una tool nueva.
- Agregar una property **opcional** al `inputSchema` de una tool existente.
- Mejorar `title` / `description`.
- Cambiar el `handler` mientras el contrato de entrada/salida se mantenga.

**NO permitido sin bump mayor + CHANGELOG:**
- Borrar o renombrar una tool.
- Agregar una property **requerida** o quitar una existente.
- Cambiar el tipo de una property.
- Cambiar la forma del resultado de una tool de forma incompatible.

**Deprecar una tool:**
1. Crear la sucesora (`moderation_ban_v2`).
2. Dejar la vieja registrada, con la description prefijada
   `[DEPRECATED: usar moderation_ban_v2] …`.
3. Borrarla recién en un release mayor de la app, anotándolo en el CHANGELOG.

## La garantía — toda feature nueva registra su tool

Regla: **si un dominio monta rutas de escritura (`app.post/patch/delete`), su
`register()` DEBE llamar `mcpRegistry.registerTool()` al menos una vez** (y, si
tiene estado que un agente querría ver, `registerStateProvider()`).

Se hace cumplir en 3 capas:

1. **Doc** — esta sección + el ítem del checklist de PR (abajo).
2. **Test** — `test/mcp-registry.test.js` bootea el server y falla si algún
   dominio de la lista `CON_ESCRITURA` no aparece como `domain` de ninguna tool.
   Al agregar una feature con escritura, sumala a esa lista.
3. **Lint** — `node scripts/check-mcp.js` (corre en `npm test`): grep de cada
   `features/*/index.js`; si tiene `app.post(`/`app.patch(`/`app.delete(` pero
   no `mcp.registerTool(`, falla con el nombre del dominio.

## Checklist de PR (copiar a CONTRIBUTING.md)

- [ ] ¿La feature agrega rutas de escritura? → registra ≥1 `mcp.registerTool`
      colocada en su propio `register()`.
- [ ] ¿La feature tiene estado que un agente querría consultar? → agrega un
      `mcp.registerStateProvider()` con su slice.
- [ ] ¿Es una acción irreversible (ban, delete, disconnect)? → `destructive: true`
      en la definición de la tool.
- [ ] `inputSchema` en JSON Schema plano (no Zod).
- [ ] Sumar el dominio a `CON_ESCRITURA` en `test/mcp-registry.test.js`.
- [ ] Correr el cliente MCP falso y `npm test`.

## Auth remota

- Por defecto el endpoint `/mcp` es **solo-localhost** (via
  `core/app.js#validateLocalMutation`).
- Env `MCP_TOKEN` seteada → se acepta desde cualquier host con
  `Authorization: Bearer <MCP_TOKEN>`. Pensado para exponer el endpoint a un
  agente en otra máquina detrás de un túnel/proxy propio.
- El token va en `%APPDATA%\tiktok-live-tts\mcp.json` (archivo aparte de
  `config.json`, que descartaría la clave) — leído al boot. WS no se toca (MCP
  es HTTP puro).
