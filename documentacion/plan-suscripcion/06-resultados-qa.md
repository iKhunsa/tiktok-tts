# 06 — Resultados QA end-to-end (parcial)

Ejecutado 2026-09-09 contra `feat/suscripciones-auth` (app local, `npm run start`,
`config.json` con `subscriptionsEnabled:true` + `cuentas.json` apuntando a
`https://cuentas.tiklivetts.es` en vivo) + `servicio-cuentas` `main` (Polar
`POLAR_ENV=test`).

**Alcance de esta corrida:** por pedido explícito, solo el flujo de negocio
central (Flujo A parcial + Flujo B completo) y el Gate C. **No se corrieron**
los flujos C (cancelación), D (expiración), E (gating/rollback) ni la sección
Transversal (F) — quedan pendientes para una corrida de QA completa antes de
producción.

Usuario de prueba: `qa+e2e1@tiklivetts.es` / `2d78ae3d-7a2e-4a95-a6f3-b374eab64c16`
(**no se borró** — queda disponible para probar C/D en una corrida futura;
sumar a la lista de limpieza de usuarios QA antes de producción).

## Resultados

| ID | Flujo | Pasos | Esperado | Real | Veredicto |
|---|---|---|---|---|---|
| A1 | Muro sin sesión | App con flag on, sin sesión | Vista Cuenta con login/registro, resto de la app accesible con candados en módulos Pro | Confirmado — "Sonidos" y "Bot" con ícono de candado en el sidebar, resto de la nav normal | ✅ PASA |
| A2 | Registro | `POST /api/auth/register` con email nuevo | `200`, sesión iniciada, `plan:free` | `GET /api/auth/session` → `{signedIn:true, plan:"free", entitlements:[], subscription:null}` | ✅ PASA |
| A4 (parcial) | Candados de features Pro | Ver módulo "Bot" siendo free | Candado + acceso de solo lectura al estado, mutaciones bloqueadas | Confirmado a nivel diseño: `GET /api/music/{queue,config,playlist}` abiertas (pintan la UI), las rutas de mutación (`skip`, `next`, `config PATCH`, `stream`, `playlist *`) están detrás de `gateMusica`. No se verificó el código de status exacto (401 vs 403) de una mutación estando free-y-logueado antes de pasar a B — quedó reemplazado por el intento de B1. | 🟡 PASA (diseño confirmado por código), verificación en vivo pendiente |
| B1 | Iniciar checkout | Disparar `POST /api/auth/checkout` | Abre el checkout de Polar del producto correcto | Checkout de Polar sandbox abierto — producto "Pro", **$85/yr** (confirma el fix de `plans.precio_anual_centavos` de la sesión anterior), email prefilled `qa+e2e1@tiklivetts.es` | ✅ PASA |
| B2 | Completar pago | Tarjeta de prueba `4242 4242 4242 4242` (o Google Pay en sandbox) | Polar redirige a `success_url` | Usuario completó el pago vía el botón Google Pay del sandbox (también válido — no toca cuentas reales, solo genera un token de prueba) | ✅ PASA |
| **B3 / Gate C** | Webhook → DB | Verificar `subscriptions` tras el pago | `status='active'`, `current_period_end` ~1 año futuro | Logs de `servicio-cuentas` (Coolify): `subscription.created`, `subscription.active`, `subscription.updated` para `user=2d78ae3d-…` `status=active`. `GET /api/auth/session` post-refresh: `subscription:{status:"active", currentPeriodEnd:"2027-09-09T17:43:52.794Z", cancelAtPeriodEnd:false}` | ✅ **PASA — Gate C CERRADO** |
| B4 | UI refleja Pro | Sin reiniciar (o tras refresh) | Badge "PRO", candados desaparecen | **Nota de proceso:** el refresh automático es cada 10 min; se forzó reiniciando el proceso local (dispara un `tick()` inmediato al arrancar) en vez de esperar. Con eso, badge "PRO" visible en sidebar, candados de "Sonidos"/"Bot" desaparecidos, vista Cuenta muestra "Pro · activo hasta 9/9/2027" | ✅ PASA (con la salvedad de que en producción real el usuario esperaría hasta 10 min sin acción manual — comportamiento ya documentado y aceptado en el diseño original) |
| B5 | Estado MCP | `get_state` del backend de la app | `auth.plan='pro'` + entitlements correctos | No se corrió explícitamente vía MCP tool (se verificó el mismo dato por `GET /api/auth/session`, misma fuente `estado.getSesion()` que consume el state provider) | 🟡 PASA por equivalencia, no verificado vía `get_state` directo |
| B6 | Features desbloqueadas | Acción antes gateada (`POST /api/music/skip`) | `200`, no `403` | `POST /api/music/skip → 200 OK` | ✅ PASA |
| B7 | Idempotencia webhook | Reenviar mismo `event_id` | `200`, sin fila nueva | No ejecutado (fuera del alcance pedido para esta corrida) | ⬜ NO EJECUTADO |
| — | Logout | Cerrar sesión | Vuelve al muro, candados reaparecen | Confirmado — vista de login, "Sonidos"/"Bot" con candado de nuevo | ✅ PASA |
| — | Re-login | Login con las mismas credenciales | Sesión Pro persiste tras re-login | Confirmado — login inmediato mostró badge PRO y candados fuera, sin esperar refresh (login siempre re-hidrata completo) | ✅ PASA |

## Hallazgo de proceso (no bug, anotar para Fase 6 / UX)

Durante la prueba, el disparo de B1 (checkout) ocurrió al interactuar con una
acción gateada dentro del módulo "Bot" en vez de por el botón explícito "Hazte
Pro" de la vista Cuenta — sugiere que clickear una función Pro bloqueada
también lleva a un flujo de upsell/checkout, lo cual es buen comportamiento de
producto, pero no se confirmó el mecanismo exacto (no estaba en el alcance de
esta corrida). Confirmar en una corrida de QA completa cuál es la UI exacta al
tocar una feature bloqueada estando en plan free.

## Pendiente para una corrida de QA completa (antes de Fase 6 / producción)

- Flujo C — Cancelación (C1–C4)
- Flujo D — Expiración (D1–D4)
- Flujo E — Gating y rollback (E1–E5), incluye degradación por servicio caído
- Transversal F1–F5 (grep de secrets, tests con flag en ambos valores, `check-mcp.js`, paridad i18n, build sin `CUENTAS_URL`)
- B7 (idempotencia del webhook)
- Confirmar código de status exacto (403, no 401) al intentar una mutación Pro estando free y logueado
- Limpieza de usuarios QA en Supabase antes de producción (sumar `2d78ae3d-…` a los 2 ya pendientes de la Fase 1)
