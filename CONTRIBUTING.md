# Guía de contribución — TikTok TTS

¡Gracias por querer aportar! Esta guía explica cómo levantar el proyecto y cómo enviar cambios.

## Requisitos

- [Node.js](https://nodejs.org/) 18+ y npm
- Windows (la app se empaqueta para Windows; el desarrollo también funciona en otros SO para la parte de servidor)
- Git

## Poner en marcha el proyecto

```bash
git clone https://github.com/iKhunsa/tiktok-tts.git
cd tiktok-tts
npm install
```

### Modos de ejecución

| Comando | Caso de uso | WebSocket | Hot Reload CSS |
|---------|-----------|-----------|----------------|
| `npm run electron` | App completa Electron + servidor. **Es el modo recomendado.** | ✅ Funciona | ❌ Requiere refresh |
| `npm run serve` | Buildea frontend + servidor. Abre `http://localhost:3000`. **Ideal para iterar UI/backend/overlays/MCP.** | ✅ Funciona | ❌ Requiere refresh |
| `npm run serve:watch` | Igual que `serve` pero con recarga del servidor (`node --watch`). | ✅ Funciona | ❌ Requiere refresh |
| `npm run dev:all` ⭐ | **PARA DESARROLLO INTERACTIVO DE CSS/HTML.** Corre compilación + servidor en paralelo. Edita CSS → Vite compila (~2s) → refresh en :3000. | ✅ Funciona | ⚠️ Automático, refresh manual |
| `npm run dev` | Solo servidor, **sin** buildear frontend. Usa `interfaz/dist/` existente. Requiere `npm run build:front` manual si editás CSS. | ✅ Funciona | ❌ Requiere rebuild + refresh |
| `npm run dev:front` | Solo Vite dev server (puerto 5173) con hot reload completo. **No recomendado:** choca con WebSocket de la app. | ❌ No funciona | ✅ Automático sin refresh |
| `npm start` | Solo servidor, sin recarga ni build. | ✅ Funciona | ❌ Requiere rebuild + refresh |

Con el servidor activo, la UI está en `http://localhost:3000`, los overlays en
`http://localhost:3000/overlay-*.html` y el endpoint MCP en
`http://localhost:3000/mcp`. Lo único que Electron aporta y el navegador no:
atajos globales de teclado, tray, auto-update y el error tracking de GlitchTip/
Aptabase (que viven en `electron-shell/`).

#### ¿Por qué los cambios de CSS no se actualizan en tiempo real?

**TL;DR:** Usa `npm run dev:all` si editas CSS/HTML frecuentemente.

**Explicación:** Express sirve archivos desde `interfaz/dist/` (compilado por Vite). Los cambios en `interfaz/src/` no aparecen automáticamente sin:
1. Recompilar Vite (`npm run build:front` manual, o automático con `dev:build-watch`)
2. Hard refresh en el navegador (Ctrl+Shift+R) para limpiar cache

- `npm run dev` = solo servidor, espera que `/dist/` esté actualizado
- `npm run dev:all` = servidor + compilador Vite en watch mode (recompila automáticamente)
- `npm run dev:front` = Vite dev server con hot reload completo (pero choca con WebSocket)

## Estructura del proyecto

```
main.js        → Proceso principal de Electron (ventana, tray, auto-update)
server.js      → Express + WebSocket: conexiones (TikTok/Twitch/YouTube), TTS, API
interfaz/      → UI y overlays (HTML/CSS/JS, modulos ESM + Vite)
  index.html     → UI principal (fuente)
  advanced.html  → Configuración avanzada (filtros, palabras bloqueadas)
  overlay-*.html → Overlays para OBS
  publico/       → estaticos (icons/, flags/, locales/, vendor/, plugin-store/)
  dist/          → build de Vite (generado, gitignored) — lo sirve core/app.js
gifts/         → PNGs de regalos de TikTok
```

Hay más contexto técnico en [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md).

## Cómo trabajar un cambio

1. Crea una rama desde `main`: `git checkout -b feat/mi-cambio`
2. Haz tus cambios y pruébalos (ver tabla de arriba).
3. Si agregas texto visible en la UI/overlays, agrega su clave en `interfaz/publico/locales/*.json`.
4. Abre un Pull Request contra `main` usando la plantilla.

### Checklist MCP (si tu feature agrega rutas de escritura)

El servidor MCP (`features/mcp/`) expone las capacidades de la app a agentes de
IA. Toda feature nueva con rutas de escritura debe seguir creciendo el toolset
(ver `features/mcp/PROTOCOL.md`). El CI lo verifica (`scripts/check-mcp.js` +
`test/mcp-registry.test.js`).

- [ ] ¿Agrega `app.post/patch/delete`? → registra ≥1 `mcp.registerTool(...)` en
      tu propio `register()`, colocada con la feature.
- [ ] ¿Tiene estado que un agente querría consultar? → `mcp.registerStateProvider(...)`.
- [ ] ¿Acción irreversible (ban, delete, disconnect)? → `destructive: true`.
- [ ] `inputSchema` en JSON Schema plano (no Zod).
- [ ] Suma tu dominio a `CON_ESCRITURA` en `test/mcp-registry.test.js`.

### Convención de commits

El historial usa [Conventional Commits](https://www.conventionalcommits.org/) con la versión entre paréntesis:

```
feat(v1.6.0): descripción corta del cambio
fix(v1.5.6): descripción del arreglo
chore(v1.5.7): tarea de mantenimiento
```

## Flujo de release (mantenedores)

1. Subir la versión en `package.json`.
2. Actualizar `CHANGELOG.md`.
3. `git tag vX.Y.Z && git push origin main --tags`
4. GitHub Actions compila el instalador NSIS y lo sube como *draft* a Releases.
5. Publicar con `gh release edit vX.Y.Z --draft=false`.

## Reportar bugs o proponer ideas

Usa las plantillas de issue. Para dudas de uso abiertas, usa Discusiones.

¡Gracias por contribuir! 💜
