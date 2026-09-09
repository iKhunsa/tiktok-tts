# HANDOFF — sistema de suscripción freemium

Checklist maestro **vivo**. Este es el único doc del set que se edita durante la
ejecución; el resto (`00`–`06`) quedan estables salvo cambio de versión de
contrato. Cada agente, al terminar, actualiza su fila de estado, marca los gates
que cumplió y agrega una línea a la bitácora.

Estados: `pendiente` · `en curso` · `bloqueado` · `hecho`.

---

## Estado por agente

| Agente | Doc | Estado | Entregables | Notas |
|---|---|---|---|---|
| 01 Investigación | `01-agente-investigacion.md` | hecho (2026-09-08) | `01-hallazgos.md` ✅ | Sondeo completo. MCP Supabase = Cloud (no sirve). No hay MCP Polar → API REST. Supabase real y patrón `telemetria-tts` en Coolify. 3 decisiones abiertas para el usuario (§7 A/B/C). |
| 02 Backend datos | `02-agente-backend-datos-supabase.md` | ✅ hecho + desplegado (2026-09-08) | migraciones ✅, `servicio-cuentas` ✅ **vivo en `cuentas.tiklivetts.es`**, `02-contrato-http.md` ✅ | Desplegado en Coolify (proyecto `servicio-cuentas`), red `coolify` compartida con Supabase, TLS por Traefik, DNS `cuentas` → VPS. Round-trip real: register/login/session/account/logout todos OK. `entitlements` sin seedear (espera `04-features-pro.md`). Polar sin configurar (Fase 2). |
| 03 Pagos Polar | `03-agente-integracion-pagos-polar.md` | ✅ código + deploy (sandbox) 2026-09-08 | `checkout.js` + `webhook-polar.js` + reconciliación ✅, `03-contrato-checkout.md` ✅ | **Sandbox operativo.** Producto Pro anual US$85 (`e68ddd7f-…`). Webhook endpoint en Polar (`d5495bf3-…`) → `cuentas.tiklivetts.es/api/webhooks/polar`, eventos `subscription.*`. Env Polar cargadas en Coolify + redeploy. Verificado: `POST /api/checkout` → `200 {url: sandbox.polar.sh/checkout/…}`. `npm test` 6/6. **Falta (Fase 6 / QA)**: pago de prueba end-to-end con tarjeta `4242…` para validar el webhook → `subscriptions`. En Fase 6: repetir setup en producción (`POLAR_ENV=production`, OAT prod, producto prod, webhook prod). |
| 04 Backend app | `04-agente-backend-app-electron.md` | ✅ **hecho** (2026-09-08) | `features/auth/` ✅, 7 gates ✅, `04-contrato-sesion.md` ✅, `04-features-pro.md` ✅, `entitlements` seedeado ✅ | Rama `feat/suscripciones-auth` (commits 0839fc2..f48c732). Dominio completo + 7 candados cableados + `auth.*` mapeado en glitchtip/aptabase. `npm test` 77/77, `check-mcp` ok, eslint 0 errores. Tabla `cuentas.entitlements` con los 7 `featureId` en `pro`. **`subscriptionsEnabled` default `false` → cero impacto en la app actual.** |
| 05 Frontend app | `05-agente-frontend-app-electron.md` | ✅ **hecho** (2026-09-08) + iter UX 2026-09-09 | `sesion.js` ✅, vista Cuenta ✅, candados sidebar ✅, i18n `cuenta.*`/`errors.*` en 10 locales ✅ | Rama `feat/suscripciones-auth` (commit 265e078). Item de sidebar oculto por defecto, visible solo con el sistema activo (decisión: oculto, no `pinned`). `build:front` OK, `npm test` 77/77, paridad de claves i18n verificada (938 hojas × 10). No-op con `subscriptionsEnabled=false` verificado en browser. **Falta**: check-in visual del flujo real de login/checkout (necesita `CUENTAS_URL` + servicio vivo → Fase 6/QA). |
| 06 QA | `06-agente-qa-validacion.md` | ✅ **hecho** (2026-09-09) | `06-resultados-qa.md` ✅ | Los 6 flujos (A, B, C, D, E) + Transversal (F) + B7 corridos de punta a punta, la mayoría contra la **app Electron real** (no solo el dev server). 6 bugs reales encontrados y arreglados en el camino (ver tabla "Resumen de bugs" en `06-resultados-qa.md`), incluyendo un hallazgo grande: el Flujo C (cancelación) no existía — implementado en esta sesión. |
| — Despliegue (Fase 6) | `00-ORQUESTADOR.md` §Fase 6 | pendiente | servicio en Coolify, DNS, release | — |

---

## Gates

| Gate | Condición (resumen) | Estado | Frena a | Cumplido el / evidencia |
|---|---|---|---|---|
| **A — Esquema estable** | Migraciones de `02` aplicadas al Supabase del VPS y verificadas; esquema no se toca más sin cambio de versión. | ✅ **CERRADO** 2026-09-08 — schema `cuentas` con 7 tablas, `plans` seedeado, migraciones registradas. Round-trip `register→login→session(plan:free)→account→logout→session(401)` **verificado contra `cuentas.tiklivetts.es` en vivo**. Esquema CONGELADO — cambios = `003_*.sql` + bump. | 03, 04, 05 | — |
| **B — Contrato HTTP congelado** | `02-contrato-http.md` escrito, revisado por el usuario, con `curl` real por endpoint. | ✅ **CERRADO** 2026-09-08 — v1.0.0, verificado end-to-end contra la instancia viva (ver anexo del doc). Pendiente solo: si el usuario quiere cambios, es bump a 1.1.x. | 04 (todo) | `02-contrato-http.md`. |
| **C — Webhook probado** | Evento de prueba de Polar → `subscriptions.status='active'` en Supabase; reintento del mismo `event_id` no duplica. | ✅ **CERRADO DEL TODO** 2026-09-09 — pago de prueba real en Polar sandbox (`subscription.created/active/updated status=active`, `current_period_end` ~1 año futuro) + B7 verificado directo contra la constraint real (`INSERT ... ON CONFLICT (event_id) DO NOTHING` → `rowCount=0` sobre un `event_id` ya existente). | 06 (flujo upgrade), Fase 6 | `06-resultados-qa.md` filas B3 y B7. |
| **D — Contrato de sesión definido** | `04-contrato-sesion.md` escrito; `features/auth/` responde `bus.on('auth:get')` con esa forma. | ✅ **CERRADO** 2026-09-08 — `04-contrato-sesion.md` + `features/auth/` responde `auth:get` con la forma documentada (test lo verifica). Agente 05 consumió el contrato (`sesion.js`). | 05 (todo) | — |

Marcá `✅` con fecha y evidencia (query result, link a `curl`, etc.) al cumplir.

---

## Pausas de revisión del usuario

| Punto | Qué revisa el usuario | Estado |
|---|---|---|
| Tras agente 01 | `01-hallazgos.md` — decisión de webhook receiver, repo de `servicio-cuentas`, riesgos abiertos. | ✅ resuelta 2026-09-08 — A: **self-hosted VPS**; B: **token opaco** (tabla `sessions`); C: **solo anual**; D: a criterio del agente 03. Repo `github.com/TikLiveTTS/servicio-cuentas` creado por el usuario. |
| Tras Gate B | `02-contrato-http.md` — el contrato que congela el trabajo del agente 04. | pendiente |
| Tras agente 05, tarea 13 | ¿La vista Cuenta es `pinned` en el sidebar u oculta por defecto? | ✅ resuelta 2026-09-08 — **oculta por defecto**, se muestra sola cuando el server tiene el sistema de cuentas activo (`/api/auth/session` ≠ 404). Sin entrada en `SIDEBAR_TOOLS`. |
| Antes de Fase 6 | Pasar `POLAR_ENV` a `production`, cargar secrets reales, activar `subscriptionsEnabled` por etapas. | pendiente |
| Cualquier cambio de contrato tras su gate | Bump de versión + confirmación. | — |

---

## Nomenclatura congelada (copia de `00-ORQUESTADOR.md`)

`features/auth/` · `servicio-cuentas` · bus `auth:get` / `auth:actualizado` · WS
`auth-updated` · `DATA_BASE/auth-session.json` ·
`%APPDATA%/tiktok-live-tts/cuentas.json` · `config.json` →
`subscriptionsEnabled` (default `false`), opcional `checkoutEnabled` ·
`nucleo/estado/sesion.js` · planes `free` / `pro` · tabla `entitlements`.

---

## Orden de ejecución

```
01 ──▶ [revisión usuario] ──▶ 02 ──▶ Gate A + Gate B ──▶ [revisión contrato]
                                            ├──▶ 03 ──▶ Gate C
                                            └──▶ 04 ──▶ Gate D
                                                   └──▶ 05
                                                          └──▶ 06 ──▶ Fase 6
```

03 y 04 en paralelo tras Gate B. 05 necesita Gate D + endpoint de checkout de 03.

Al cerrar 06 y antes de Fase 6: **`/ponytail-review`** sobre el código de las
fases 1–4.

---

## Bitácora

Formato: `- YYYY-MM-DD — <agente> — <qué pasó>`.

- 2026-09-09 — orquestador — **Gating visual Pro completo (Sonidos, Bot, MCP, Overlays) +
  ponytail-audit repo-wide aplicado.** Con el sistema de cuentas ya cerrado (Gates A-D +
  cancelar/reanudar verificado end-to-end contra Polar real), el frontend solo pintaba un
  candado chico en el sidebar — un usuario free podía entrar de lleno a Sonidos/Bot/MCP y
  usarlos hasta que una acción puntual devolvía 403 sin explicación. Ahora esas 3 vistas se
  ven bloqueadas de verdad: contenido real con blur + overlay centrado + popup de venta que
  se abre solo automáticamente la primera vez por sesión de la app (helper reusable
  `interfaz/src/nucleo/estado/vista-bloqueada.js`). Overlays queda 100% gratis — solo se
  gateó "Fondo personalizado" (entitlement nuevo `overlay-decoraciones`, backend + frontend).
  Tienda de Plugins suma badge "PRO" en las cards 100% gateadas. Commit `90e5c62` en
  `feat/suscripciones-auth`, pusheado. Bug encontrado y corregido en el camino: el popup
  automático se disparaba apenas arrancaba la app (antes de que el usuario entrara a la
  vista) — atado a que la vista esté realmente visible (`offsetParent`) + re-chequeo en
  `switchView()`. Verificado en vivo con usuario free real: blur+popup en las 3 vistas,
  overlays 100% funcional, gate real 403 en `/api/upload-bg` (tras reiniciar el dev server,
  que no había recargado el código nuevo). Después se corrió `/ponytail:ponytail-audit`
  (repo completo, 3 agentes en paralelo por área) y se aplicaron los 6 hallazgos: helper
  `nuevoMsgId()` en `cliente-ws.js` (reemplaza 10 copias del mismo patrón), helper
  compartido `electron-shell/resolve-config-value.js` (reemplaza 3 versiones de "leer
  config con override env+JSON" en main.js/aptabase.js/glitchtip.js), código muerto
  borrado en `cola-tts.js` (`_ttsBarTimer` siempre null), `GOOGLE_TTS_LANGS`/
  `DICT_FILTER_LANGS` dejaron de duplicarse en `features/configuracion/default-config.js`
  (el TODO(fase-03) decía que era temporal hasta que `/idioma` existiera — ya existe),
  `escaparAtributo()` compartida en `interfaz/compartido/escapar-html.js` (reemplaza la
  copia idéntica de `esc()` en cuenta/index.js y popup-pro.js), y `LogStorage` (única
  `class` del frontend) pasó a closure. Commit `b629396`, pusheado. `npm test` 78/78 en
  ambos commits, `npm run lint` 0 errores, `build:front` limpio. De paso se borraron las 6
  cuentas QA de prueba en Supabase (`qa+e2e1/e2e2/e3`, y 3 más del handoff anterior) —
  pendiente de la nota del 06 ya resuelto. Único pendiente real que queda ahora: el
  endpoint de "deshacer cancelación" YA se implementó en la sesión anterior (`/subscription/
  resume`, ver commit de servicio-cuentas) — la nota vieja de abajo (línea del 06) está
  desactualizada en ese punto.

- 2026-09-09 — orquestador — **Agente 06 (QA) CERRADO — Flujos C/D/E/F + B7
  corridos, 6 bugs reales encontrados y arreglados.** Corrida contra la app
  **Electron empaquetada real** (no solo el dev server), simulando la caída
  de `servicio-cuentas` con una URL muerta en vez de tocar el servicio en
  vivo. Hallazgo grande: **el Flujo C (cancelación) no existía** — el botón
  "Gestionar suscripción" estaba mal cableado al mismo handler que "Hazte
  Pro" y dejaba a un usuario Pro pagar $85 de nuevo sin aviso (confirmado en
  sandbox real, con la tarjeta guardada de la compra anterior). Con OK
  explícito del usuario, se implementó `POST /api/subscription/cancel` en
  `servicio-cuentas` (llama directo a la API de Polar con el
  `polar_subscription_id` ya guardado, sin portal hosteado) + el fix del
  frontend — commits `0695a6b`/`9466e01` (servicio-cuentas),
  `9d17350` (app). Otros 4 bugs menores de UI/refresh arreglados en el
  camino (detalle completo en `06-resultados-qa.md`: CSS `[hidden]` que no
  ocultaba de verdad, `config-updated` sin resync, 4xx de Polar reportado
  como 502). B7 (idempotencia del webhook) verificado directo contra la
  constraint de la tabla real. **Los 4 Gates están cerrados del todo.**
  `npm test` 78/78 (app) y 9/9 (`servicio-cuentas`) tras cada fix. Único
  pendiente real que queda: endpoint de "deshacer cancelación" (hoy se
  maneja desde Polar directo) y limpieza de usuarios QA en Supabase.

- 2026-09-09 — orquestador — **Flujo D (expiración) probado ad-hoc + 2 fixes reales de B1/B4
  encontrados y corregidos.** Flujo D: `UPDATE` manual en Supabase (`current_period_end` al
  pasado) sobre la suscripción de `qa+e2e1` → `GET /api/session` directo devolvió `plan:free`
  de inmediato (D1/D2 ✅); refresh de la app reflejó candados de vuelta + `POST /api/music/skip`
  → `403` (no `401`, confirma que el gate Pro es distinto del muro de login) (D3 ✅); el job de
  reconciliación **revirtió el cambio manual** en el siguiente redeploy (D4, comportamiento
  esperado y ya avisado de antemano — confirmado en vivo). Corriendo el flujo con una 2ª y 3ª
  cuenta de prueba salieron 2 gaps reales del lado de checkout (commit `d68676e`, más
  `af52a77` en `servicio-cuentas`): (1) `window.open()` después de un `await` se bloqueaba en
  un navegador normal — el checkout de Polar ahora abre como **ventana Electron propia**
  (`electron-shell/window.js#isPolarUrl`, sin preload) en vez de ir al navegador del sistema;
  (2) el plan solo se enteraba del pago en el próximo tick del refresh de 10 min — ahora la
  ventana de checkout detecta `/checkout/ok`, se cierra sola a los 1.5s, y al cerrarse emite
  `bus.emit('auth:forzar-refresh')` que dispara un `refresh.tick()` inmediato. Ambos fixes
  verificados en la **app Electron real** (no el dev server) con una cuenta nueva de punta a
  punta: pago → ventana se cierra sola → plan Pro visible sin ninguna acción manual. `npm test`
  78/78. Detalle completo en `06-resultados-qa.md`.

- 2026-09-09 — orquestador — **QA end-to-end parcial + Gate C cerrado.** Flujo A
  (parcial) + Flujo B completo probados contra la app local (`subscriptionsEnabled:true`,
  `cuentas.json` → servicio vivo) + `servicio-cuentas` real. Registro, login, checkout
  (Polar sandbox, producto Pro **$85/yr** — confirma el fix de precio de la sesión
  anterior), pago con Google Pay del sandbox, webhook recibido (`subscription.created/
  active/updated`), `subscriptions.status='active'` confirmado, UI refleja badge PRO +
  candados fuera, acción antes gateada (`POST /api/music/skip`) pasa a `200`, logout +
  re-login preservan el plan. Resultados en `06-resultados-qa.md`. **Gate C CERRADO**
  (falta solo B7, idempotencia del webhook, no bloqueante). Quedan sin correr los
  flujos C/D/E/F — próxima corrida de QA antes de producción. Usuario de prueba
  `qa+e2e1@tiklivetts.es` (`2d78ae3d-…`) queda vivo a propósito para esa corrida —
  sumar a la limpieza de usuarios QA antes de Fase 6.

- 2026-09-09 — orquestador — **Fixeados los 3 hallazgos de `07-auditoria-seguridad.md`.**
  Vuln 1 (HIGH, bypass del muro por mayúsculas): `core/guard-suscripcion.js` normaliza
  `req.path` a minúsculas antes de comparar + `app.set('case sensitive routing', true)`
  en `core/app.js` como defensa en profundidad. Test nuevo: `POST /API/tts` (mayúscula)
  con flag on + sin sesión → 401. Vuln 3 (MEDIUM, PII por WS a la LAN):
  `estado-sesion.js#getSesionPublica()` (solo `signedIn/plan/entitlements/degraded`,
  sin email/user-id/subscription) reemplaza el payload completo en los 2 sitios que
  hacen `bus.emit('ws:broadcast', {type:'auth-updated', ...})` (`refresh.js`,
  `index.js` — tool MCP `auth_logout`); `cliente-ws.js` ya no aplica el payload
  recortado directo, llama `cargarSesion()` (HTTP solo-localhost) para el perfil
  completo. Vuln 2 (HIGH, rate-limit anulable con `X-Forwarded-For` falso) — repo
  `servicio-cuentas`: `trustProxy` pasó de booleano (`true`) a hop-count (`int`,
  default `1`) en `config.js`; `rate-limit.js` acepta `keyFn` opcional; `login.js`
  suma un segundo limitador keyeado por email normalizado (además del de IP
  existente). `npm test` app 77→78, `servicio-cuentas` 6→8. `build:front` y
  `check-mcp.js` OK. Push a `servicio-cuentas` `main` (`073c84f`) + `TRUST_PROXY`
  corregido a `1` en Coolify (production y preview — estaba en el string `"true"`,
  que ya caía al default nuevo por ser no-numérico, pero se dejó explícito para
  no confundir) + redeploy disparado por MCP. Verificado: logs del contenedor
  arrancan limpio (`[servicio-cuentas] escuchando en :4000`), `status: running:healthy`.
  **Los 3 hallazgos de la auditoría están cerrados y en producción.**
- 2026-09-09 — orquestador — **Aplicados los "igual conviene" descartados de la auditoría** (commit
  `bbb2207` en `servicio-cuentas` `main`, pusheado y desplegado). Pepper de contraseña ahora pre-hasheado
  con HMAC-SHA256 antes de bcrypt (cost 10→12) — `verificar-password.js` prueba el esquema nuevo y cae al
  viejo (concat sin HMAC) para no invalidar hashes ya guardados; test nuevo confirma la compatibilidad.
  Idempotency del webhook de Polar corregida: usa el header `webhook-id` (spec Standard Webhooks) en vez
  de campos inexistentes del body (`evento.id`/`evento.event_id` daban `undefined`). `PUBLIC_ORIGIN` default
  pasa de `*` a vacío en código y en Coolify (production + preview, estaba en `*` literal) — no hay ningún
  consumidor legítimo desde navegador hoy. `docker-compose.yml` actualizado para que sus defaults
  documentados coincidan con el código. `npm test` servicio-cuentas 8→9. Deploy verificado (logs limpios,
  `status: running:healthy`).
- 2026-09-09 — orquestador — **Audit de over-engineering (ponytail-audit) aplicado.** ~−150 líneas, −1 dep (`undici`), −7 archivos. Borrado `core/error-boundary.js` (muerto), `features/avanzado/{accesibilidad,feature-flags}.js`; `getConfigSnapshot` ×5 → `core/config-snapshot.js`; `sanear()` ×2 → `electron-shell/sanear.js`; `features/auth/gating.js` inline; 3 `ensure-*-config.js` → `scripts/ensure-configs.js`; `movil/utils.js` 1 escaper. Arreglada de paso la única violación cross-import (`bot/` → `avanzado/FEATURES`). Fix: `loadVoices` crasheaba (`TypeError`) al arrancar deslogueado. `CLAUDE.md` regla de modularidad reescrita ("antes reusar" + umbral n-consumidores). Commits `effe85c`..`bcf14ea`. `npm test` 77/77.
- 2026-09-09 — orquestador — **Auditoría de seguridad (skill `security-review`).** Ver `07-auditoria-seguridad.md`. 3 hallazgos confirmados: **Vuln 1 HIGH** (bypass del muro por casing en `core/guard-suscripcion.js` — `/API/config` sin auth), **Vuln 2 HIGH** (`servicio-cuentas`: rate-limit anulable con `X-Forwarded-For`, `trust proxy: true`), **Vuln 3 MEDIUM** (email+user-id de cuenta al WS de toda la LAN). **NINGUNO arreglado todavía** — es lo siguiente a hacer.
- 2026-09-08 — orquestador — set de planes creado (`00`–`06` + este handoff). Nada ejecutado todavía.
- 2026-09-09 — agente 05 — **Iteración UX** (feedback del usuario). Vista Cuenta rediseñada (card centrada tipo auth, `:active`/easing por criterio emil-design-eng, skills de Emil Kowalski instaladas en `.agents/` + regla en CLAUDE.md). **Muro de login**: `appBloqueada() = activo && !signedIn` → `body.app-bloqueada` apaga la nav + `switchView()` rebota todo a `'cuenta'` (flag off = sin efecto). Botón "Cuenta" movido de la nav al footer. Eliminada la sección "Canales" (portafolio `#socialModal`) por completo. Iconos del sidebar unificados a `fill="white"`. Commits 4e28b98, 7bb5125, 56fa1c8, 9adb979. `CUENTAS_URL` **bakeado** (`cuentas-config.json` commiteado + `extraResources`): todo `.exe` instalado resuelve `https://cuentas.tiklivetts.es` sin archivo local (verificado con simulación de install limpio). Registro real verificado end-to-end contra el servicio vivo (usuarios QA `2cf26e73…`, `f4601f22…` → borrar). Ponytail-review de Fases 1–4 aplicado (net −21 líneas, commit `4cc281a`).

**Enforcement backend hecho** (`core/guard-suscripcion.js`): con `subscriptionsEnabled` activo, todo `/api/*` exige `signedIn` (cualquier plan) salvo whitelist (config/status/logs-client/overlay-stats/gifts-list/mcp-info/report-bug + `/api/auth/*` + todo lo no-`/api/`). 401 `errors.unauthorized`. WS queda abierto (decisión: overlays de OBS no pueden loguearse, es solo-broadcast). Escape hatches del muro: Reportar Bug + idioma + banner Discord siguen vivos; popups/onboarding arrancan post-login.
- 2026-09-08 — agente 05 — **Fase 4 (frontend) CERRADA.** `nucleo/estado/sesion.js` (almacen espejo de config-runtime, hidratado por `/api/auth/session` + WS `auth-updated`), vista Cuenta (`vistas/principal/cuenta/`, patrón `mcp/index.js`): registro/login, perfil con nombre editable, estado de plan, "Hazte Pro" → `window.open` del checkout (window.js rebota al navegador externo), logout. Item de sidebar oculto por defecto (se muestra solo con el sistema activo), badge PRO + candado en items de módulos Pro bloqueados. i18n `cuenta.*` + 7 `errors.*` nuevos en los 10 locales (paridad 938×10 verificada). Commit 265e078 en `feat/suscripciones-auth`. `build:front` OK, `npm test` 77/77, no-op con flag off verificado en browser. Falta solo el check-in visual del flujo real (Fase 6, necesita servicio vivo).
- 2026-09-08 — orquestador — **Fase 3 backend CERRADA.** `features/auth/` + 7 candados + event mapping (rama `feat/suscripciones-auth`, commits 0839fc2, 0e361a9, 990a4b0, f48c732). `cuentas.entitlements` seedeado con los 7. `npm test` 77/77. Falta solo Fase 4 (frontend) y Fase 6 (QA + producción). El flag `subscriptionsEnabled` está `false` → la rama se puede mergear sin cambiar nada visible.
- 2026-09-08 — orquestador — **Fase 3 planning.** Inventario de features (subagente). Split free/Pro confirmado con el usuario. `04-features-pro.md` + `04-contrato-sesion.md` escritos.
- 2026-09-08 — orquestador — **Fase 2 (sandbox) cerrada.** Código de checkout + webhook + reconciliación en `servicio-cuentas` (commits 64a5dc0, 4c2a274). Webhook endpoint creado en Polar sandbox. Env Polar en Coolify + redeploy. `POST /api/checkout` verificado → URL de Polar. `03-contrato-checkout.md` escrito. Pendiente solo el pago de prueba real (Fase 6/QA) y el mismo setup en producción (Fase 6).
- 2026-09-08 — orquestador — **Fase 2 arrancada.** Producto "Pro" (anual, US$85) creado en Polar **sandbox** (`e68ddd7f-e954-4e8f-9c13-7bc7f2393a07`).
- 2026-09-08 — orquestador — **Fase 1 desplegada.** `servicio-cuentas` creado en Coolify (Docker Compose desde el repo público), env vars cargadas, red `coolify` compartida con Supabase (toggle en ambos + restart de Supabase ~60s), dominio `cuentas.tiklivetts.es` con TLS (Traefik) y DNS por MCP de Hostinger. Bugs resueltos en el camino: (1) repo privado → el usuario lo hizo público; (2) hostname de Postgres = `supabase-db-<uuid>` no `supabase-db` (verificado con `getent` desde el contenedor); (3) `permission denied for schema cuentas` → el SQL Editor del Studio corre como `supabase_admin`, se transfirió `OWNER TO postgres`. `/api/health` → `{"ok":true}`. Round-trip completo verde. Usuario de prueba QA borrado. **Gate A y Gate B cerrados.**
- 2026-09-08 — agente 02 — Fase 1 (código). Repo `TikLiveTTS/servicio-cuentas` construido y pusheado (4 commits): esquema (6 tablas) + `migrate.js` + rutas auth reales (register/login/logout/session/entitlements/account/health) + stubs 501 (checkout/webhook-polar) para el agente 03 + cliente Polar y verificador de firma listos + job de barrido de sesiones. Smoke test 5/5. `02-contrato-http.md` v1.0.0.
- 2026-09-08 — orquestador — **Gate A (esquema) cerrado**: corrí las migraciones directo en el SQL Editor del Studio de Supabase (el usuario se logueó, yo manejé por Claude in Chrome). `CREATE SCHEMA cuentas` + 6 tablas + índices + seed `plans` + `schema_migrations` pre-cargado. Verificado con 2 queries (7 tablas, 2 filas de migración, 2 planes). El esquema queda congelado; `servicio-cuentas` al desplegarse verá las migraciones ya aplicadas y no las repite.
- 2026-09-08 — orquestador — datos de infra confirmados: Supabase self-hosted = servicio Coolify `supabase` (Postgres 15, contenedor `supabase-db`, user `postgres`/db `postgres`), Traefik como proxy, `connect_to_docker_network: false`. Postgres NO expuesto públicamente (5432/6543 timeout desde afuera). MCP `supabase.tiklivetts.es/mcp` con anon key → sigue "Needs authentication" (falta service_role key o es OAuth; ver tab "MCP" del diálogo Connect de Supabase). **Gate A cierra vía deploy del usuario en Coolify** — no hay acceso remoto al Postgres desde esta sesión. `docker-compose` + README con la guía de deploy + toggle de red. Config del deploy lista, esperando al usuario.
- 2026-09-08 — agente 01 — Fase 0 ejecutada. Sondeo de MCP Supabase (= Cloud, proyecto inactivo ajeno), Coolify (VPS: Supabase self-hosted `running:healthy`, `telemetria-tts` app, dominio `telemetria.tiklivetts.es`), Polar (sin MCP; API REST `api.polar.sh/v1`, checkout + webhooks `standardwebhooks` firma base64), y lectura del repo `TikLiveTTS/telemetria-tts` (patrón `api/src/` + `db/migrate.js` + SQL versionado). `01-hallazgos.md` escrito. **Pausa de revisión activa** — 3 decisiones para el usuario antes de Fase 1.

---

## Bugs / bloqueos abiertos

Formato: `- [severidad] <descripción> — repro — agente dueño — estado`.

- _(ninguno)_
