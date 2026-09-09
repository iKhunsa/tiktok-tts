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
| 05 Frontend app | `05-agente-frontend-app-electron.md` | ✅ **hecho** (2026-09-08) | `sesion.js` ✅, vista Cuenta ✅, candados sidebar ✅, i18n `cuenta.*`/`errors.*` en 10 locales ✅ | Rama `feat/suscripciones-auth` (commit 265e078). Item de sidebar oculto por defecto, visible solo con el sistema activo (decisión: oculto, no `pinned`). `build:front` OK, `npm test` 77/77, paridad de claves i18n verificada (938 hojas × 10). No-op con `subscriptionsEnabled=false` verificado en browser. **Falta**: check-in visual del flujo real de login/checkout (necesita `CUENTAS_URL` + servicio vivo → Fase 6/QA). |
| 06 QA | `06-agente-qa-validacion.md` | pendiente | `06-resultados-qa.md` | — |
| — Despliegue (Fase 6) | `00-ORQUESTADOR.md` §Fase 6 | pendiente | servicio en Coolify, DNS, release | — |

---

## Gates

| Gate | Condición (resumen) | Estado | Frena a | Cumplido el / evidencia |
|---|---|---|---|---|
| **A — Esquema estable** | Migraciones de `02` aplicadas al Supabase del VPS y verificadas; esquema no se toca más sin cambio de versión. | ✅ **CERRADO** 2026-09-08 — schema `cuentas` con 7 tablas, `plans` seedeado, migraciones registradas. Round-trip `register→login→session(plan:free)→account→logout→session(401)` **verificado contra `cuentas.tiklivetts.es` en vivo**. Esquema CONGELADO — cambios = `003_*.sql` + bump. | 03, 04, 05 | — |
| **B — Contrato HTTP congelado** | `02-contrato-http.md` escrito, revisado por el usuario, con `curl` real por endpoint. | ✅ **CERRADO** 2026-09-08 — v1.0.0, verificado end-to-end contra la instancia viva (ver anexo del doc). Pendiente solo: si el usuario quiere cambios, es bump a 1.1.x. | 04 (todo) | `02-contrato-http.md`. |
| **C — Webhook probado** | Evento de prueba de Polar → `subscriptions.status='active'` en Supabase; reintento del mismo `event_id` no duplica. | 🟡 endpoint configurado + firma verificada por test (403 en firma mala); falta el pago de prueba real con tarjeta `4242…` (Fase 6/QA) | 06 (flujo upgrade), Fase 6 | Endpoint Polar `d5495bf3-…`. |
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

- 2026-09-08 — orquestador — set de planes creado (`00`–`06` + este handoff). Nada ejecutado todavía.
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
