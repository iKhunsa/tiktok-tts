# Ejecución del rebuild — prompts listos para pegar

Este archivo tiene 14 prompts autocontenidos, uno por fase del rebuild del backend. Cada uno se pega en una **terminal nueva de Claude Code**, abierta en la raíz del repo `tiktok-tts`, sin contexto de ninguna conversación previa.

Cadena de ramas apiladas (cada rama sale de la anterior, no de `Dev-2-nuevo-backend` directo salvo la Fase 0):

```
Dev-2-nuevo-backend
  └─ backend/fase-00-archivar-backend-viejo
       └─ backend/fase-01-core
            └─ backend/fase-02-configuracion
                 └─ backend/fase-03-idioma
                      └─ backend/fase-04-reporte-bug
                           └─ backend/fase-05-moderacion
                                └─ backend/fase-06-canales
                                     └─ backend/fase-07-chat
                                          └─ backend/fase-08-overlay-movil
                                               └─ backend/fase-09-sonido
                                                    └─ backend/fase-10-bot
                                                         └─ backend/fase-11-clips
                                                              └─ backend/fase-12-avanzado-donar-electron-shell-telemetria
                                                                   └─ backend/fase-13-cierre
```

Ejecutar una fase a la vez. Antes de arrancar la fase N, la rama de la fase N-1 debe existir en `origin` (el PR draft no necesita estar mergeado, solo la rama pusheada).

---

## Fase 0 — Archivar backend viejo + placeholders de arranque

```
Trabajás en el repo tiktok-tts (rama actual: cualquiera, vas a cambiar de rama vos mismo). Vas a ejecutar la Fase 0 del rebuild del backend descrito en el repo.

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/mapa-funciones-actual.md (referencia — solo la sección citada en fase-00)
   - plan-fases/fase-00-archivar-backend-viejo.md (documento completo — es tu especificación de esta fase)

2. Creá la rama `backend/fase-00-archivar-backend-viejo` desde `Dev-2-nuevo-backend` (fetch/pull origin primero):
   git fetch origin
   git checkout -b backend/fase-00-archivar-backend-viejo origin/Dev-2-nuevo-backend

3. Implementá EXACTAMENTE lo que dice fase-00-archivar-backend-viejo.md — alcance de archivos a mover (git mv, preserva historial), placeholders a crear, nada más y nada menos que lo ahí descrito.

4. Antes de dar la fase por terminada, verificá cada punto de la sección "Criterios de aceptación" de fase-00-archivar-backend-viejo.md uno por uno. No sigas si alguno falla.

5. Si usás subagentes para explorar/mapear código, no hace falta worktree (son de solo lectura). Si en algún punto lanzás subagentes que EDITAN archivos del repo en paralelo entre sí, lanzalos con isolation: "worktree" para que no se pisen.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-00): archivar backend viejo y placeholders de arranque"
   git push -u origin backend/fase-00-archivar-backend-viejo
   gh pr create --draft --base Dev-2-nuevo-backend --head backend/fase-00-archivar-backend-viejo --repo iKhunsa/tiktok-tts --title "Fase 0: Archivar backend viejo + placeholders" --body "Implementa plan-fases/fase-00-archivar-backend-viejo.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 1 — /core (kernel)

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 1 del rebuild del backend (requiere que la Fase 0 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección "/core (kernel — no es un dominio, es el sostén)" y sección "Contratos entre módulos — resumen"
   - plan-fases/logging-errores-propuesta.md, sección /core (eventos core.logger.*, core.http.*, core.ws.*, core.dominio.*, core.boundary.*, core.bus.*, y las 9 reglas duras del encabezado del documento)
   - plan-fases/mapa-funciones-actual.md, sección "Sin clasificar / infraestructura transversal"
   - plan-fases/fase-01-core.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-01-core origin/backend/fase-00-archivar-backend-viejo

3. Implementá EXACTAMENTE lo que dice fase-01-core.md — alcance de archivos a crear en /core, contratos que debe hacer cumplir mecánicamente (bus, contratos síncronos inyectados, estado propio por dominio, fallo aislado).

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-01-core.md uno por uno. Prestá atención especial a: ningún level=error sin stack, cero console.* sueltos.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-01): construir /core (kernel)"
   git push -u origin backend/fase-01-core
   gh pr create --draft --base backend/fase-00-archivar-backend-viejo --head backend/fase-01-core --repo iKhunsa/tiktok-tts --title "Fase 1: /core (kernel)" --body "Implementa plan-fases/fase-01-core.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 2 — /configuracion

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 2 del rebuild del backend (requiere que la Fase 1 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /configuracion
   - plan-fases/logging-errores-propuesta.md, sección /configuracion, y la regla dura #5 (nunca loguear el objeto config completo — fixea el leak de adminIdentities)
   - plan-fases/mapa-funciones-actual.md, sección Configuracion
   - plan-fases/fase-02-configuracion.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-02-configuracion origin/backend/fase-01-core

3. Implementá EXACTAMENTE lo que dice fase-02-configuracion.md. Es el único dominio dueño de config.json y platform-config.json — otros dominios leen vía contrato, nunca importan el store directo. Prioridad alta: fixear el leak de logging de config completo (incluye adminIdentities) que hoy existe en server.js:701 y server.js:2153.

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-02-configuracion.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-02): construir /configuracion"
   git push -u origin backend/fase-02-configuracion
   gh pr create --draft --base backend/fase-01-core --head backend/fase-02-configuracion --repo iKhunsa/tiktok-tts --title "Fase 2: /configuracion" --body "Implementa plan-fases/fase-02-configuracion.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 3 — /idioma

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 3 del rebuild del backend (requiere que la Fase 2 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /idioma
   - plan-fases/logging-errores-propuesta.md, sección /idioma (eventos idioma.script.evaluado / idioma.dict.evaluado en debug, sin loguear el texto del mensaje por privacidad; idioma.dict.cargado / idioma.dict.carga_fallida)
   - plan-fases/mapa-funciones-actual.md, sección Idioma
   - plan-fases/fase-03-idioma.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-03-idioma origin/backend/fase-02-configuracion

3. Implementá EXACTAMENTE lo que dice fase-03-idioma.md. Dominio puro, sin estado mutable compartido — /moderacion y /sonido lo van a consumir vía función pura importada, no vía bus.

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-03-idioma.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-03): construir /idioma"
   git push -u origin backend/fase-03-idioma
   gh pr create --draft --base backend/fase-02-configuracion --head backend/fase-03-idioma --repo iKhunsa/tiktok-tts --title "Fase 3: /idioma" --body "Implementa plan-fases/fase-03-idioma.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 4 — /reporte-bug

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 4 del rebuild del backend (requiere que la Fase 3 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /reporte-bug
   - plan-fases/logging-errores-propuesta.md, sección /reporte-bug
   - plan-fases/mapa-funciones-actual.md, sección Reporte-bug
   - plan-fases/fase-04-reporte-bug.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-04-reporte-bug origin/backend/fase-03-idioma

3. Implementá EXACTAMENTE lo que dice fase-04-reporte-bug.md. Único dominio que habla con el webhook de Discord; se suscribe a los eventos de error globales del core desde ahora, para que toda fase siguiente ya quede capturada y reportable.

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-04-reporte-bug.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-04): construir /reporte-bug"
   git push -u origin backend/fase-04-reporte-bug
   gh pr create --draft --base backend/fase-03-idioma --head backend/fase-04-reporte-bug --repo iKhunsa/tiktok-tts --title "Fase 4: /reporte-bug" --body "Implementa plan-fases/fase-04-reporte-bug.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 5 — /moderacion

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 5 del rebuild del backend (requiere que la Fase 4 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /moderacion (contrato síncrono moderacionPolicy.evaluate(msg), fail-open documentado)
   - plan-fases/logging-errores-propuesta.md, sección /moderacion — TODOS los eventos moderacion.store.*, moderacion.filtro.*, moderacion.policy.*, moderacion.accion.*, moderacion.palabras.*, con atención especial a moderacion.filtro.mensaje_bloqueado (debe llevar SIEMPRE {platform, userId, nick, key, motivo})
   - plan-fases/mapa-funciones-actual.md, secciones Moderacion (server.js) y moderation-store.js
   - plan-fases/fase-05-moderacion.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-05-moderacion origin/backend/fase-04-reporte-bug

3. Implementá EXACTAMENTE lo que dice fase-05-moderacion.md. Es la pieza de acoplamiento fuerte más importante del rebuild — /chat (Fase 7) va a depender directamente del contrato evaluate(msg) que este dominio implementa.

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-05-moderacion.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-05): construir /moderacion"
   git push -u origin backend/fase-05-moderacion
   gh pr create --draft --base backend/fase-04-reporte-bug --head backend/fase-05-moderacion --repo iKhunsa/tiktok-tts --title "Fase 5: /moderacion" --body "Implementa plan-fases/fase-05-moderacion.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 6 — /canales

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 6 del rebuild del backend (requiere que la Fase 5 ya tenga su rama pusheada en origin).

Esta es la fase más grande del rebuild en cantidad de archivos (~45 funciones/endpoints repartidos en TikTok, Twitch, YouTube, OBS, OAuth device-flow, EventSub). Reservá el turno completo para esto.

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /canales (contrato: único productor de eventos crudos de plataforma; eventos canal:mensaje-crudo, canal:gift, canal:follow, canal:like, canal:estado)
   - plan-fases/logging-errores-propuesta.md, sección /canales — TODOS los eventos canales.tiktok.*, canales.twitch.*, canales.youtube.*, canales.rate_limit.*, canales.obs.*, canales.twitch_oauth.*, canales.twitch_eventsub.*
   - plan-fases/mapa-funciones-actual.md, sección Canales
   - plan-fases/fase-06-canales.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-06-canales origin/backend/fase-05-moderacion

3. Implementá EXACTAMENTE lo que dice fase-06-canales.md. /canales no conoce Chat/Overlay/Moderación — solo publica al bus.

4. Si dividís el trabajo en piezas independientes (ej. TikTok / Twitch / YouTube / OBS por separado) usando subagentes que EDITAN código en paralelo, lanzalos con isolation: "worktree" obligatorio para que no se pisen entre sí. Subagentes de solo exploración no necesitan worktree.

5. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-06-canales.md uno por uno.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-06): construir /canales"
   git push -u origin backend/fase-06-canales
   gh pr create --draft --base backend/fase-05-moderacion --head backend/fase-06-canales --repo iKhunsa/tiktok-tts --title "Fase 6: /canales" --body "Implementa plan-fases/fase-06-canales.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 7 — /chat

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 7 del rebuild del backend (requiere que la Fase 6 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /chat (contrato: requiere veredicto de moderación ANTES de decidir TTS/overlay, vía moderacionPolicy.evaluate(msg) fail-open; Chat nunca llama a Overlay/Sonido directo, publica chat:mensaje-permitido)
   - plan-fases/logging-errores-propuesta.md, sección /chat (chat.mensaje.emitido en debug nunca el texto, chat.mensaje.bloqueado en info con motivo, chat.policy_fallo_evaluacion en error)
   - plan-fases/mapa-funciones-actual.md, sección Chat
   - plan-fases/fase-07-chat.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-07-chat origin/backend/fase-06-canales

3. Implementá EXACTAMENTE lo que dice fase-07-chat.md. Es el primer punto de integración multi-dominio real: orquesta el flujo completo de un mensaje desde /canales, pasando por /moderacion, hasta publicarlo enriquecido para /overlay, /sonido, /movil.

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-07-chat.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-07): construir /chat"
   git push -u origin backend/fase-07-chat
   gh pr create --draft --base backend/fase-06-canales --head backend/fase-07-chat --repo iKhunsa/tiktok-tts --title "Fase 7: /chat" --body "Implementa plan-fases/fase-07-chat.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 8 — /overlay y /movil (en paralelo)

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 8 del rebuild del backend (requiere que la Fase 7 ya tenga su rama pusheada en origin).

/overlay y /movil no tienen dependencia funcional entre sí — son ambos consumidores puros de eventos ya publicados por /canales y /chat. Se construyen en el mismo turno pero como dos dominios independientes.

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, secciones /overlay y /movil (Overlay: puramente consumidor + transformador de estado visual, no escribe en moderation.json ni config.json. Movil: espejo de solo lectura del estado + traductor de comandos hacia el bus, no conoce lógica interna de otros dominios)
   - plan-fases/logging-errores-propuesta.md, secciones /overlay y /movil (overlay.followers.*, overlay.gift.*, overlay.fondo.*, overlay.test.*, movil.acceso.*, movil.emparejado, movil.comando.*, movil.qr.*)
   - plan-fases/mapa-funciones-actual.md, secciones Overlay y Movil
   - plan-fases/fase-08-overlay-movil.md (documento completo — tu especificación de esta fase, cubre ambos dominios)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-08-overlay-movil origin/backend/fase-07-chat

3. Implementá EXACTAMENTE lo que dice fase-08-overlay-movil.md para ambos dominios.

4. Como /overlay y /movil son independientes entre sí, conviene paralelizarlos con dos subagentes que editan código en paralelo — en ese caso lanzalos con isolation: "worktree" obligatorio, uno para /overlay y otro para /movil, para que no se pisen. Subagentes de solo exploración no necesitan worktree.

5. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-08-overlay-movil.md uno por uno (cubre ambos dominios).

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-08): construir /overlay y /movil"
   git push -u origin backend/fase-08-overlay-movil
   gh pr create --draft --base backend/fase-07-chat --head backend/fase-08-overlay-movil --repo iKhunsa/tiktok-tts --title "Fase 8: /overlay y /movil" --body "Implementa plan-fases/fase-08-overlay-movil.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 9 — /sonido

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 9 del rebuild del backend (requiere que la Fase 8 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /sonido (tres subcarpetas tts/, musica/, soundpad/; contrato: decide QUÉ se lee, nunca decide moderación)
   - plan-fases/logging-errores-propuesta.md, sección /sonido — eventos sonido.tts.* y sonido.musica.*, con atención especial a sonido.musica.cola_llena (debe incluir usuario, plataforma y tamaño de cola)
   - plan-fases/mapa-funciones-actual.md, sección Sonido (incluye music-engine.js completo, factory createMusicEngine)
   - plan-fases/fase-09-sonido.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-09-sonido origin/backend/fase-08-overlay-movil

3. Implementá EXACTAMENTE lo que dice fase-09-sonido.md. Consume chat:mensaje-permitido de /chat, nunca decide moderación (ya viene resuelta).

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-09-sonido.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-09): construir /sonido"
   git push -u origin backend/fase-09-sonido
   gh pr create --draft --base backend/fase-08-overlay-movil --head backend/fase-09-sonido --repo iKhunsa/tiktok-tts --title "Fase 9: /sonido" --body "Implementa plan-fases/fase-09-sonido.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 10 — /bot

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 10 del rebuild del backend (requiere que la Fase 9 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /bot (separa detección de comando de ejecución, que vive en /sonido)
   - plan-fases/logging-errores-propuesta.md, sección /bot (bot.comando.detectado en debug, bot.comando.no_reconocido en debug solo si config.debugLog)
   - plan-fases/mapa-funciones-actual.md, sección Bot (hoy solo existe el comando !p)
   - plan-fases/fase-10-bot.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-10-bot origin/backend/fase-09-sonido

3. Implementá EXACTAMENTE lo que dice fase-10-bot.md. Separa detección del comando !p (hoy acoplado en handleMusicRequest) de su ejecución en /sonido.

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-10-bot.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-10): construir /bot"
   git push -u origin backend/fase-10-bot
   gh pr create --draft --base backend/fase-09-sonido --head backend/fase-10-bot --repo iKhunsa/tiktok-tts --title "Fase 10: /bot" --body "Implementa plan-fases/fase-10-bot.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 11 — /clips

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 11 del rebuild del backend (requiere que la Fase 10 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, sección /clips (contrato: no conoce el protocolo OBS WS, solo pide "guarda replay" al bus; Canales/obs lo ejecuta)
   - plan-fases/logging-errores-propuesta.md, sección /clips (clips.marcado.solicitado / exitoso / fallido)
   - plan-fases/mapa-funciones-actual.md, sección Clips (atajo global Ctrl+Shift+M, POST /api/obs/save-replay ya migrado en Fase 6, comando móvil markClip/deleteClip ya cubierto en Fase 8)
   - plan-fases/fase-11-clips.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-11-clips origin/backend/fase-10-bot

3. Implementá EXACTAMENTE lo que dice fase-11-clips.md. Es el dominio más chico del rebuild — buen caso de validación del patrón "contrato síncrono inyectado vs evento de bus" antes de cerrar el bloque de dominios de negocio.

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-11-clips.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-11): construir /clips"
   git push -u origin backend/fase-11-clips
   gh pr create --draft --base backend/fase-10-bot --head backend/fase-11-clips --repo iKhunsa/tiktok-tts --title "Fase 11: /clips" --body "Implementa plan-fases/fase-11-clips.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo, y el link del PR.
```

---

## Fase 12 — /avanzado, /donar, /electron-shell, /telemetria

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 12 del rebuild del backend (requiere que la Fase 11 ya tenga su rama pusheada en origin).

Esta es la fase donde vuelve el empaquetado completo de Electron (tray, auto-updater, atajos globales) — reemplaza el main.js/preload.js/server.js placeholder de la raíz (de la Fase 0) por la versión completa.

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/arquitectura-propuesta.md, secciones /avanzado, /donar, /electron-shell, /telemetria (transversal)
   - plan-fases/logging-errores-propuesta.md, secciones /avanzado, /telemetria, /electron-shell (y revisar overlap con /reporte-bug ya cubierto en Fase 4)
   - plan-fases/mapa-funciones-actual.md, secciones Avanzado, Donar, Sin clasificar/infraestructura transversal (main.js, preload.js, telemetry/* completo)
   - plan-fases/fase-12-avanzado-donar-electron-shell-telemetria.md (documento completo — tu especificación de esta fase)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-12-avanzado-donar-electron-shell-telemetria origin/backend/fase-11-clips

3. Implementá EXACTAMENTE lo que dice fase-12-avanzado-donar-electron-shell-telemetria.md para los cuatro dominios/módulos.

4. Si dividís el trabajo entre /avanzado+/donar (placeholders/reexport) por un lado y /electron-shell+/telemetria (empaquetado) por otro, usando subagentes que EDITAN código en paralelo, lanzalos con isolation: "worktree" obligatorio. Subagentes de solo exploración no necesitan worktree.

5. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-12-avanzado-donar-electron-shell-telemetria.md uno por uno.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-12): construir /avanzado, /donar, /electron-shell, /telemetria"
   git push -u origin backend/fase-12-avanzado-donar-electron-shell-telemetria
   gh pr create --draft --base backend/fase-11-clips --head backend/fase-12-avanzado-donar-electron-shell-telemetria --repo iKhunsa/tiktok-tts --title "Fase 12: /avanzado, /donar, /electron-shell, /telemetria" --body "Implementa plan-fases/fase-12-avanzado-donar-electron-shell-telemetria.md. Ver criterios de aceptación en ese archivo."

7. Reportá al final: qué se implementó, qué quedó pendiente o es riesgo (especialmente sobre el empaquetado completo funcionando), y el link del PR.
```

---

## Fase 13 — Cierre

```
Trabajás en el repo tiktok-tts. Vas a ejecutar la Fase 13 (última) del rebuild del backend (requiere que la Fase 12 ya tenga su rama pusheada en origin).

1. Leé estos archivos ANTES de tocar código, en este orden:
   - plan-fases/mapa-funciones-actual.md (checklist final, dominio por dominio)
   - plan-fases/arquitectura-propuesta.md (checklist final)
   - plan-fases/logging-errores-propuesta.md (checklist final)
   - CLAUDE.md (raíz del repo) — su sección "Arquitectura" describe el monolito viejo, hay que reescribirla
   - plan-fases/fase-13-cierre.md (documento completo — tu especificación de esta fase, paso a paso)

2. Creá la rama desde la fase anterior:
   git fetch origin
   git checkout -b backend/fase-13-cierre origin/backend/fase-12-avanzado-donar-electron-shell-telemetria

3. Seguí el paso a paso de fase-13-cierre.md: checklist de paridad función por función contra mapa-funciones-actual.md, auditoría final de logging, reescritura de CLAUDE.md a la arquitectura por dominios, eliminación de backend-viejo/.

4. Antes de dar la fase por terminada, verificá cada punto de "Criterios de aceptación" de fase-13-cierre.md uno por uno.

5. Subagentes de solo lectura/exploración: sin worktree. Subagentes que editan código del repo en paralelo: isolation: "worktree" obligatorio.

6. Commit + push + PR draft:
   git add -A
   git commit -m "feat(fase-13): cierre del rebuild, paridad confirmada, CLAUDE.md actualizado"
   git push -u origin backend/fase-13-cierre
   gh pr create --draft --base backend/fase-12-avanzado-donar-electron-shell-telemetria --head backend/fase-13-cierre --repo iKhunsa/tiktok-tts --title "Fase 13: Cierre" --body "Implementa plan-fases/fase-13-cierre.md. Última fase del rebuild — paridad confirmada contra backend-viejo/, CLAUDE.md actualizado."

7. Reportá al final: resultado del checklist de paridad completo, qué quedó documentado como descartado a propósito (si algo), y el link del PR. Este PR, una vez mergeado en cadena hasta Dev-2-nuevo-backend, es el candidato final para mergear a dev.
```
