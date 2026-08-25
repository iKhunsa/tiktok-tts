# Prompt para Claude Code — generar planes de remediación

Copiar y pegar esto en una sesión de Claude Code (con plan mode) dentro del repo `tiktok-tts`:

---

Actuá como backend/devops senior. Ya se hizo una auditoría de arquitectura de este repo (evidencia abajo, con file:line real), verificada y ampliada el 2026-08-25. Para cada uno de los 11 hallazgos activos (el 7 quedó cerrado, ver abajo), entrá en plan mode y generá un plan de implementación independiente y accionable — no lo implementes todavía, solo planificá cada uno por separado antes de tocar código. Priorizá los planes en este orden: primero quick wins (1, 3, 9, 11, 12), después CI/tests (2, 8), después el resto (4, 5, 6, 10).

## Hallazgos a planificar

**1. `configuracion/store.js` no escribe atómico.**
`save()` usa `fs.writeFileSync(CONFIG_FILE, ...)` directo al path real — sin tmp+rename. Riesgo de corrupción de `config.json` en crash o corte de luz. `moderacion/store/flush.js` ya tiene el patrón correcto (escribe a `.tmp` y hace `fs.renameSync`) — replicar ese patrón acá.

**2. Cero tests + CI no corre nada antes de release.**
No hay `*.test.js`/`*.spec.js`/`__tests__` en todo el repo, ni script `test` en `package.json`. `.github/workflows/release.yml` va directo de `npm ci` a `build:electron --publish` sin ningún gate. Planificar: qué test runner introducir (dado que es Electron + Express + WS, nada de frontend framework pesado), qué se testea primero (los módulos puros como `moderacion/store/*`, `idioma/*`, `canales/*/reconnect*` son los más testeables sin mocks pesados), y cómo agregar un job de CI que corra antes del build/publish.

**3. Secrets embebidos en el instalador distribuido.**
Webhook de Discord y token de telemetría se inyectan en build time (`webhook-config.generated.json` / `telemetry-config.generated.json`) y se empaquetan via `extraResources` en `package.json` — quedan extraíbles por cualquiera que abra el instalador. Planificar mitigación (rotación fácil si se filtra, ¿vale la pena moverlo a un proxy/backend propio en vez de exponer el webhook directo?, o aceptarlo como riesgo conocido y documentarlo).

**4. `core/ws-server.js` sin rate/size limit por cliente.**
El handler de `ws.on('message')` no limita tamaño ni frecuencia de mensajes por cliente. Además pasa el objeto `ws` crudo dentro de `bus.emit('ws:mensaje-entrante', ...)`, acoplando el transporte a la lógica de dominio. Planificar: límite de tamaño de mensaje, rate limit básico, y cómo desacoplar el objeto `ws` del bus (pasar solo lo necesario, no el socket completo).

**5. `core/shutdown.js` sin timeout global.**
Los dominios se apagan en orden inverso, cada uno en su propio try/catch, pero si el `shutdown()` de un dominio nunca resuelve (promesa colgada), `shutdownAll` se cuelga indefinidamente. Planificar un timeout por dominio (ej. `Promise.race` con un límite razonable) que fuerce el avance al siguiente dominio si uno no responde.

**6. yt-dlp no mata sub-procesos (riesgo de zombies).**
`sonido/musica/engine/spawn-child.js` + `run-ytdlp.js` trackean y matan el proceso hijo inmediato con `child.kill()`, pero si yt-dlp genera sub-hijos (ej. ffmpeg), esos no reciben la señal — quedan huérfanos, especialmente en Windows. Planificar un tree-kill real (ej. `taskkill /T /F` en Windows via `spawn-child.js`, o librería que mate el árbol de procesos).

**7. CERRADO (verificado 2026-08-25).**
`sanitizeForTTS` duplicado (`chat/sanitize-for-tts.js` vs `sonido/sanitize-for-tts.js`) es intencional y está documentado en el propio código (`sonido/sanitize-for-tts.js:3-5`: "/api/tts re-sanitiza defensivamente"). `cleanTwitchChannel` (`canales/twitch/clean-channel.js`) vs `cleanName` (`chat/clean-name.js`) no era duplicación real — hacen cosas distintas (uno limpia URLs de canal, el otro normaliza nombres para pronunciación TTS). No requiere plan.

**8. Sin script de lint.**
`package.json` no tiene `lint` script. Planificar qué linter adoptar (ESLint con config mínima, consistente con el estilo ya usado en el repo) y si se integra al mismo job de CI del hallazgo #2.

**9. Fondos de overlay huérfanos en disco.**
`public/index.html:3582-3602` (`uploadBg`) — al reemplazar un fondo (`POST /api/upload-bg`), el cliente solo actualiza `appSettings.overlays[type].bgimg` con la URL nueva; nunca borra el archivo anterior. Solo `removeBg()` (`index.html:3604-3614`) limpia, y solo cuando el usuario quita el fondo explícitamente. Cada reemplazo dentro de una sesión deja el archivo viejo en `DATA_BASE/uploads/` para siempre — a diferencia de `sonido/soundpad/routes/upload.js:38-46` que sí cappea a 24 sonidos. Planificar: capturar la URL vieja antes de subir la nueva y disparar `DELETE` tras confirmar el upload, o mover la limpieza al backend (`overlay/routes/upload-bg.js`) recibiendo `oldFilename` en el mismo POST.

**10. Import cruzado de dominio no documentado como contrato.**
`sonido/tts/langs.js:6-8` importa directo `../../idioma/google-tts-langs`, `../../idioma/dict-filter-langs`, `../../idioma/voice-to-dict-lang` — módulos internos de `idioma/`, saltándose el contrato de dominios que el propio repo documenta y respeta en otro lado (`moderacion/filters/moderation-stage.js:5,11` usa `core/contracts/idioma-filtrar.js` con comentario explícito "nunca require('../../idioma/...') directo"). Planificar: mover esas tres constantes a un contrato (`core/contracts/idioma-datos.js` o extender `idioma-filtrar.js`) para no tener dos patrones distintos conviviendo en el mismo repo.

**11. Dependencias npm no usadas.**
`canvas-confetti` y `driver.js` figuran en `package.json` `dependencies`, pero el código de browser usa copias vendored estáticas en `public/vendor/confetti.js` y `public/vendor/driver.js`, servidas directo sin pasar por `node_modules`. No hay ningún `require()` de esos paquetes en el repo. Viajan como peso muerto en el instalador (electron-builder empaqueta `node_modules/**/*`). Planificar: quitarlas de `package.json`, o si se prefiere consistencia, migrar `public/vendor/*` a consumir las npm packages vía build step.

**12. `core/broadcast.js` sin manejo de error por cliente.**
`core/broadcast.js:12-18` — `client.send(msg)` dentro del `forEach` sin callback de error ni try/catch. Si un socket falla el envío (buffer lleno, conexión cayendo justo en el check `readyState`), el mensaje se pierde silenciosamente para ese cliente sin loguearlo — dificulta diagnosticar desincronía de overlays en producción. Planificar: pasar callback a `.send(msg, (err) => { if (err) logger.log(...) })`.

## Formato de salida esperado

Para cada uno de los 8 hallazgos, generar un plan separado y concreto: archivos a tocar, patrón a seguir (citando el archivo que ya lo hace bien cuando aplica, ej. `moderacion/store/flush.js` para el hallazgo 1), y cómo verificar que el fix funciona. No agrupar todo en un plan gigante — cada hallazgo es una unidad de trabajo independiente que se puede aprobar y ejecutar por separado.
