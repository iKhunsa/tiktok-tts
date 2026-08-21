# Fase 0 — Archivar backend viejo + placeholders de arranque

## Objetivo
Sacar TODO el código del backend actual (monolítico) de la raíz del repo, dejarlo en `backend-viejo/` como referencia de solo lectura sin ninguna conexión activa con `package.json`/Electron/el front, y dejar la app arrancando (sin funcionalidad real) con placeholders mínimos mientras se construye el backend nuevo fase a fase.

## Por qué este orden
No se puede empezar a escribir `/core` ni ningún dominio nuevo mientras `server.js`/`main.js` siguen siendo los que arrancan la app — se pisarían. Archivar primero da un punto de partida limpio y, a la vez, deja un ancla funcional (aunque sea vacía) para no dejar la app rota mientras se reconstruye por partes.

## Referencia
- `mapa-funciones-actual.md` — inventario completo de lo que hace cada archivo que se archiva aquí (para consultarlo después sin tener que abrir `backend-viejo/` entero).
- Ninguna sección de `arquitectura-propuesta.md`/`logging-errores-propuesta.md` aplica todavía — esta fase es puramente mecánica (mover archivos), la implementación real empieza en la Fase 1.

## Alcance — mover con `git mv` (preserva historial)

A `backend-viejo/`:
- `server.js`
- `main.js`
- `moderation-store.js`
- `music-engine.js`
- `preload.js`
- `telemetry/` (carpeta completa: `index.js`, `buffer.js`, `identity.js`, `transport.js`, `creator-cache.js`, `connectors/*.js`)
- `blocked-words.md`
- `gifts/` (810 PNGs)
- `tray-icon.ico`
- `installer-electron.iss`

A `backend-viejo/scripts/`:
- `scripts/ensure-webhook-config.js`
- `scripts/ensure-telemetry-config.js`

**Se queda en la raíz** (no es parte del backend viejo, es independiente): `scripts/generate-lang-words.js` — genera `public/lang-words/*.json`, dato de front que `/idioma` reusará en la Fase 3.

**No se toca:** `asset/logo.png` (huérfano, confirmado sin referencias en ningún código — se deja donde está sin investigar más), `public/` completo (front, sin cambios en esta fase).

## Paso a paso

1. `git status` primero — confirmar árbol limpio o solo los 3 `.md` de diseño sin commitear, antes de mover nada.
2. `git mv server.js main.js moderation-store.js music-engine.js preload.js blocked-words.md tray-icon.ico installer-electron.iss backend-viejo/`
3. `git mv telemetry backend-viejo/telemetry`
4. `git mv gifts backend-viejo/gifts`
5. `mkdir -p backend-viejo/scripts && git mv scripts/ensure-webhook-config.js scripts/ensure-telemetry-config.js backend-viejo/scripts/`
6. Crear `backend-viejo/README.md`:
   ```
   Código de referencia, solo lectura, desconectado de package.json/main.js activos.
   No se ejecuta. Se elimina cuando el backend nuevo (ver /plan-fases) cubra su funcionalidad.
   Consultar junto con mapa-funciones-actual.md para ubicar cualquier función por nombre.
   ```
7. Crear placeholders en la raíz (marcados `// PLACEHOLDER TEMPORAL — reemplazado fase a fase, ver /plan-fases`):
   - `main.js` — Electron mínimo: `BrowserWindow`, espera `GET /api/status` antes de `loadURL('http://127.0.0.1:PORT')`, usa `preload.js` nuevo. Sin tray/updater/uiohook (vuelven en Fase 12).
   - `server.js` — Express mínimo: `express.static(path.join(__dirname,'public'))`, `GET /api/status` → `{ok:true, placeholder:true}`, `server.listen(PORT)`.
   - `preload.js` — misma superficie `window.electronAPI` que el original (`getAppVersion`, `trackEvent`, `onMarkClip/offMarkClip`, `onUpdateEvent/offUpdateEvent`, `installUpdate`, `registerTtsShortcut*`, `registerSoundpadShortcut*`, `onPlaySoundpad/offPlaySoundpad`) pero todo no-op — evita que `public/*.html` reviente al invocar métodos que ya no existen.
8. Actualizar `package.json`:
   - `build.win.icon` → `"backend-viejo/tray-icon.ico"`
   - `build.extraResources` → quitar entradas `gifts/`, `blocked-words.md`, `tray-icon.ico` (ya no están en la raíz; se reincorporan cuando el dominio correspondiente las necesite en fases posteriores)
   - `build.files` → dejar solo `"main.js"`, `"preload.js"`, `"server.js"`, `"node_modules/**/*"` + los mismos excludes de `.pdb`/tests/`.cache` que ya existían
   - `scripts.prebuild:electron` → apuntar a `backend-viejo/scripts/ensure-webhook-config.js`/`ensure-telemetry-config.js`, o comentar temporalmente si bloquea el arranque del placeholder (decidir en ejecución según si `build:electron` se corre en esta fase o no — probablemente no hace falta hasta Fase 12)

## Criterios de aceptación
- `git status` muestra los archivos movidos como `renamed:`, no como `deleted:`+`new file:` sueltos.
- `npm run electron` abre la ventana y muestra `public/index.html` sirviéndose desde el Express placeholder, sin `window.electronAPI.X is not a function` en la consola del renderer (DevTools).
- `grep -rn "require(.*backend-viejo" .` (excluyendo `backend-viejo/` mismo) da cero resultados.
- `backend-viejo/` no aparece en `package.json > build.files` (solo puede aparecer en `build.extraResources`/`build.win.icon` si se decidió reincorporar algo puntual).

## Riesgos
- Si `public/*.html` tiene alguna llamada a `window.electronAPI` sin optional chaining que no está cubierta por los no-ops del preload nuevo, el renderer puede tirar error en consola — no bloquea la carga de la página pero hay que revisar la lista completa de métodos expuestos contra el `preload.js` original antes de darla por buena.
- `build:electron` (empaquetado real) no se prueba en esta fase — solo `npm run electron` en dev. El empaquetado completo se valida recién en la Fase 12.
