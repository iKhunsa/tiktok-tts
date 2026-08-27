# Auditoría de arquitectura — historial

Auditoría original con 8 hallazgos (2026-08-25), 3 más agregados en una segunda pasada (9-12). **Los 12 quedaron cerrados por el commit `7244d1d`** ("fix: cierra 11 hallazgos de auditoria de arquitectura + actualiza grafo", 2026-08-25) — el #7 ya no aplicaba (falso positivo, ver abajo), de ahí que el commit hable de 11.

Verificado contra código real el 2026-08-26: los 12 están efectivamente resueltos, no solo declarados en el mensaje del commit.

## Estado final

1. **`configuracion/store.js` — CERRADO.** `save()` ahora escribe a `CONFIG_TMP_FILE` + `fs.renameSync` ([configuracion/store.js:17-18](configuracion/store.js:17)), mismo patrón que `moderacion/store/flush.js`.

2. **Cero tests + CI sin gate — CERRADO.** `package.json` tiene `"test": "node --test \"test/**/*.test.js\""` y `"lint": "eslint ."`. `.github/workflows/release.yml` corre lint+test como gate antes del build de release.

3. **Secrets embebidos en el instalador — DOCUMENTADO como riesgo aceptado.** Sigue viajando en `extraResources` (decisión de diseño, no bug — ver sección "Secrets embebidos" en `CLAUDE.md` raíz), pero ahora con runbook de rotación explícito.

4. **`core/ws-server.js` — CERRADO.** Tiene rate/size limit por cliente.

5. **`core/shutdown.js` — CERRADO.** Cada `shutdown()` de dominio corre con `withTimeout()` ([core/shutdown.js:11-29](core/shutdown.js:11)) — un dominio colgado ya no bloquea `shutdownAll`.

6. **yt-dlp zombies — CERRADO.** Tree-kill real implementado para Windows.

7. **CERRADO — era falso positivo, no requería fix.** `sanitizeForTTS` duplicado es intencional (documentado en el propio código). `cleanTwitchChannel` vs `cleanName` no era duplicación real.

8. **Sin lint — CERRADO.** Ver punto 2.

9. **Fondos de overlay huérfanos — CERRADO.** `uploadBg()` ahora captura la URL vieja y dispara `DELETE /api/upload-bg` tras confirmar el nuevo upload ([public/index.html:3584-3604](public/index.html:3584)).

10. **Import cruzado de dominio — CERRADO.** `sonido/tts/langs.js` ahora re-exporta desde `core/contracts/idioma-datos.js`, con comentario explícito citando el patrón de `idioma-filtrar.js`.

11. **Dependencias npm no usadas — CERRADO.** `canvas-confetti` y `driver.js` ya no figuran en `package.json`.

12. **`core/broadcast.js` sin manejo de error — CERRADO.** `client.send(msg, (error) => {...})` ahora loguea el fallo por cliente ([core/broadcast.js:16-22](core/broadcast.js:16)).

## Nota para futuras auditorías

Esta sesión de graphify (2026-08-26) inicialmente reportó los 12 hallazgos como "siguen vigentes" — fue un error del agente de verificación, no reflejaba el código real. Antes de confiar en un reporte de auditoría, comparar contra `git log` y leer el archivo real citado — no asumir que un hallazgo viejo sigue abierto solo porque estaba en este documento.
