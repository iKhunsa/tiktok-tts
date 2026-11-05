# MCP — Servidor de herramientas para agentes

Dominio que expone las capacidades de la app como **tools MCP** (Model Context Protocol) para que un agente (Claude Code, Claude Desktop) opere la app: leer el chat, moderar, manejar música, consultar estado. 

Transporte **Streamable HTTP** en `POST /mcp` (SDK `@modelcontextprotocol/sdk`, stateless, server+transport nuevos por request). `features/mcp/` se registra **último** en `server.js`.

## Registro de tools

**`core/contracts/mcp-registry.js`** — registro append-only (mismo idiom que `core/contracts/perf.js`: singleton require-once). 

API:
- `registerTool({name, title, description, inputSchema, handler, readOnly?, destructive?, idempotent?, domain})`
- `listTools()`
- `callTool(name, args)` (devuelve `{ok, result}` o `{ok:false, error:{code,message,stack?}}` — nunca lanza)
- `registerStateProvider(fn, domain)`
- `collectState()`

## Regla de crecimiento (forzada por CI)

Todo dominio que monta `app.post/patch/delete` **debe** llamar `mcp.registerTool()` desde su propio `register()`, colocado con la feature. 

Lo verifican:
- `scripts/check-mcp.js` (grep)
- `test/mcp-registry.test.js` (boot + assert)

**Exentos con justificación:**
- `chat` (lectura vía `get_recent_chat`)
- `reporte-bug` (post externo)

Ver `features/mcp/PROTOCOL.md`.

## Schemas e inputs

**`inputSchema` en JSON Schema plano** — los dominios no tocan Zod; `features/mcp/transport/schema-adapter.js` lo convierte al shape que pide el SDK.

**Handlers** usan seams de bus/dominio, no self-calls HTTP (salvo donde el acople req/res es pesado — `channels_disconnect` marcado `// MCP-FALLBACK`).

## Estado pull-based

`get_state` = `collectState()` (cada `registerStateProvider` de cada dominio) + pulls de `config:get` etc. Un campo nuevo se agrega en el provider de su dominio, en un solo lugar.

## Seguridad

**Doble gate de destructivas:**
- `mcpEnabled` (default `true` — endpoint solo-localhost)
- `mcpDestructiveToolsEnabled` (default `false`)

Las tools con `destructive:true` (ban/mute/disconnect/delete/set_config) se filtran del cable en `build-server.js` cuando el 2º toggle está off; el host del agente igual pide confirmación por el `destructiveHint`.

**Auth remota (seam):** por defecto solo-localhost (`core/app.js#validateLocalMutation`). Env `MCP_TOKEN` seteada → acepta cualquier host con `Authorization: Bearer <token>`.

## Observabilidad

`features/mcp/observability.js` decora `callTool` → `mcp.tool.{llamada,fallo,excepcion}` al bus → GlitchTip + Aptabase (`mcp_tool_used`) + telemetría, gratis. 

**Todo error del subsistema MCP** (`mcp.*.excepcion`, `mcp.transport.error`, `mcp.registro.*`) se fingerprintea en GlitchTip como `error_mcp_*`; los fallos esperados de tool (`mcp.tool.fallo`) NO son issue.

## UI

Sección "Agente MCP" en la tienda de plugins (`interfaz/src/vistas/principal/mcp/`, nace oculta):
- Toggles
- Endpoint
- Snippets de config
- Tabla de tools por dominio

El `description`/`title` del schema (lo que ve el agente) queda en **inglés**; la tabla de la UI usa claves i18n propias `mcp.toolDesc.<name>` y `mcp.domain.<slug>` (fallback al `description` inglés). El endpoint URL y los snippets JSON no se traducen.

`GET /api/mcp/info` — estado + catálogo de tools para la UI (GET, sin auth).
