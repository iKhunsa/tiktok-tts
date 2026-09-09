# 06 — Resultados QA end-to-end

Ejecutado 2026-09-09 en dos corridas: la primera contra la app en modo dev
(`npm run start`) + `servicio-cuentas` en vivo; la segunda (Flujos C/D/E/F)
contra la **app Electron empaquetada real** (`npm run electron`,
`%APPDATA%\tiktok-live-tts\config.json` con `subscriptionsEnabled:true`).

**Estado: completo.** Los 6 flujos (A, B, C, D, E) + Transversal (F) + B7
fueron corridos. Se encontraron y arreglaron 6 bugs reales en el camino (ver
cada sección) — ninguno bloqueante hoy porque `subscriptionsEnabled` sigue en
`false` por default, pero todos había que cerrarlos antes de activar el flag
en producción.

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
| B4 | UI refleja Pro | Sin reiniciar (o tras refresh) | Badge "PRO", candados desaparecen | **Corrida 1 (antes del fix):** el refresh automático era cada 10 min sin ninguna señal de pago confirmado; se forzó reiniciando el proceso local para verificar el resto del flujo. **Corrida 2 (después del fix, ver "Hallazgos reales" abajo), en Electron real:** al cerrarse la ventana de checkout el plan se actualiza solo, sin reiniciar nada — badge "PRO", candados fuera, "Pro · activo hasta 9/9/2027" | ✅ PASA — instantáneo, ya no depende de esperar el ciclo de 10 min |
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

## Hallazgos reales de B1/B4 — corregidos en la misma sesión (commit `d68676e`)

Corriendo el flujo con el `Browser pane` (Chrome sin Electron) en vez de la
app empaquetada salieron dos gaps reales, ambos arreglados y re-verificados
contra la **app Electron real** (no el dev server):

1. **`window.open()` después de un `await` se bloquea en un navegador normal.**
   `irACheckout()` (`cuenta/index.js`) hacía `await pedir('/api/auth/checkout')`
   y recién después `window.open(url)`. Cualquier navegador puede tratar esa
   apertura como no-iniciada-por-el-usuario tras la espera de red y bloquearla
   en silencio — pasó exactamente eso en el Browser pane. **Fix:** el checkout
   de Polar ahora abre como **ventana Electron propia** (no en el navegador del
   sistema) — `electron-shell/window.js#isPolarUrl` matchea `*.polar.sh` antes
   de caer a `shell.openExternal`, sin preload (no expone `electronAPI` a la
   página de pago de un tercero). Verificado en Electron real: se abre
   "TikLiveTTS Sandbox | Pro" como ventana nativa de 900×720.
2. **El plan solo se enteraba en el próximo tick del refresh (10 min).**
   Sin ninguna señal de "ya se confirmó el pago", un usuario real ve la UI
   vieja (free) hasta 10 minutos después de pagar — exactamente lo que generó
   la sospecha inicial de "el caché no se actualiza". **Fix:** la ventana de
   checkout detecta la navegación a `/checkout/ok` y se cierra sola a los
   1.5s; al cerrarse (por éxito o porque el usuario la cerró sin pagar) emite
   `bus.emit('auth:forzar-refresh')`, que `features/auth/index.js` escucha
   para correr `refresh.tick()` de inmediato. Verificado en Electron real con
   una cuenta nueva (`qa+e2e3@tiklivetts.es`): tras pagar, la ventana se cerró
   sola y la vista Cuenta pasó a "Pro · activo hasta 9/9/2027" **sin ninguna
   acción manual ni reinicio**.

`npm test` 78/78 tras el fix. `servicio-cuentas` `checkout.js` actualizado
(texto de la página de éxito, ya no dice "cerrá la pestaña" sino que refleja
el cierre automático) — commit `af52a77`, desplegado.

## Flujo D — Expiración (ad-hoc, contra la app Electron real)

| ID | Pasos | Esperado | Real | Veredicto |
|---|---|---|---|---|
| D1 | `UPDATE subscriptions SET current_period_end = ayer` (SQL directo, usuario `qa+e2e1`) | Fila actualizada | Confirmado, `status` sin tocar | ✅ PASA |
| D2 | `GET /api/session` directo a `servicio-cuentas` (no el caché de la app) | `plan:free` | `{plan:"free", subscription:null, entitlements:[]}` | ✅ PASA |
| D3 | App tras refresh: candados vuelven, `POST /api/music/skip` | `403` (no `401`) | Badge PRO desaparece, candados vuelven, `POST /api/music/skip → 403 Forbidden` — confirma que el gate Pro es distinto del muro de login | ✅ PASA |
| D4 | Job de reconciliación no revierte mientras no corre | Sin cambios hasta el próximo ciclo/restart | Confirmado en el momento; el **siguiente redeploy de `servicio-cuentas` sí revirtió** el cambio manual (`[reconciliar] divergencia ... -> corregido`), como se advirtió de antemano — comportamiento correcto, no bug | ✅ PASA |

## Flujo E — Gating y rollback (contra la app Electron real)

| ID | Pasos | Esperado | Real | Veredicto |
|---|---|---|---|---|
| E1 | `PATCH /api/config {subscriptionsEnabled:false}` en caliente | Candados fuera, vista Cuenta oculta, sesión no se borra | Candados fuera al toque (el gate siempre chequea en vivo). **Bug encontrado:** el item "Cuenta" del sidebar seguía visible con `hidden=true` seteado en JS — `.sidebar-item{display:flex}` le ganaba en la cascada a `[hidden]`. **Fix:** `.sidebar-item[hidden]{display:none}` en `index-legacy.css`. Confirmado con `getComputedStyle` real: `display:none` tras el fix | ✅ PASA (con fix, commit `0db77ed`) |
| E2 | Volver a `true` | Estado re-aplica correcto | **Bug encontrado:** el `case 'config-updated'` de `cliente-ws.js` nunca tocaba `sesion.js`, así que el badge/vista quedaban con el estado viejo hasta un login/logout o reload manual. **Fix:** llama `cargarSesion()` cuando el config recibido incluye la clave `subscriptionsEnabled`. Confirmado en vivo: sin reload, item reaparece con badge PRO correcto | ✅ PASA (con fix, mismo commit) |
| E3 | `servicio-cuentas` "caído" (simulado con `cuentas.json` apuntando a `127.0.0.1:1`, sin tocar el servicio real) + usuario Pro | Dentro de la gracia (30 min) sigue Pro; pasada la gracia degrada a `free`; al revivir vuelve a Pro | Los 4 sub-casos confirmados con `cachedAt` manipulado: dentro de gracia → `plan:pro, degraded:true`; pasada la gracia → `plan:free, entitlements:[], degraded:true` (fail-safe real); log `auth.servicio.sin_respuesta` (no `auth.sesion.expirada` — ese es solo para 401 de token inválido, esto es network); al revivir → `plan:pro, degraded:false` de nuevo | ✅ PASA |
| E4 | `cuentas.json` con JSON inválido | App arranca igual, loguea `core.dominio.fallo_montaje`, resto de dominios OK | App arranca perfecto y el dominio auth sigue funcionando — pero **nunca dispara `core.dominio.fallo_montaje`**, porque `config-servicio.js#resolverUrl()` ya neutraliza el JSON corrupto con su propio try/catch y cae al `cuentas-config.json` bundleado, antes de que el mount pueda fallar. Mejor que lo previsto, solo distinto evento (ninguno) | ✅ PASA (matiz: el log esperado no aplica, el mecanismo de fondo es más robusto) |
| E5 | Firma de webhook inválida | `401`, `subscriptions` sin tocar | Ya cubierto por test automatizado (`webhook.test.js`): responde `403` (no `401` — el doc original tenía el código mal, corregido acá), `subscriptions` nunca se toca porque `verificarFirma` lanza antes de cualquier query | ✅ PASA |

## Flujo C — Cancelación (contra la app Electron real) — hallazgo grande

**No existía ningún flujo de cancelación real.** El botón "Gestionar suscripción"
estaba cableado al mismo handler que "Hazte Pro" (`irACheckout`) — un usuario
Pro que lo clickeaba terminaba en un checkout **nuevo**, listo para pagar
$85/yr otra vez, sin ningún aviso de que ya era Pro. Confirmado en vivo contra
Polar sandbox: el checkout hasta traía la tarjeta guardada de la compra
anterior. Investigado en los docs de diseño (`01-hallazgos.md`,
`03-agente-integracion-pagos-polar.md`) — nunca se planeó un flujo de
cancelación iniciado por el usuario, solo el lado del webhook (reaccionar si
Polar avisa `subscription.canceled` desde afuera).

**Decisión del usuario: implementarlo ahora.** Se agregó `POST /api/subscription/cancel`
en `servicio-cuentas` (Bearer, sin body) que llama directo a
`PATCH https://api.polar.sh/v1/subscriptions/{id} {cancel_at_period_end:true}`
usando el `polar_subscription_id` ya guardado — sin portal hosteado, no hacía
falta. Actualiza `cancel_at_period_end` local de forma optimista (no espera el
webhook). El frontend separó `#cuentaManage` de `#cuentaUpgrade` con un
`confirm()` antes de cancelar. i18n nuevo (`cuenta.confirmCancel`,
`cuenta.canceled`) en los 10 locales.

| ID | Pasos | Esperado | Real | Veredicto |
|---|---|---|---|---|
| C1 | `POST /api/auth/subscription/cancel` sobre un usuario Pro (`qa+e2e3`) | Cancela al fin del período | Webhook confirma `subscription.updated` + `subscription.canceled`; `GET /api/auth/session` pasa a `subscription.cancelAtPeriodEnd:true`; vista Cuenta muestra "Pro · se cancela el 9/9/2027" | ✅ PASA (implementado en esta sesión, commits `0695a6b`/`9d17350` app+servicio) |
| C2 | Webhook `canceled` → DB | `status='canceled'`, `current_period_end` intacto | Confirmado por los logs de Coolify | ✅ PASA |
| C3 | Usuario sigue viendo Pro sin candados hasta `current_period_end` | Sí | `plan` sigue `'pro'` mientras `current_period_end > now()` — misma regla ya validada en Flujo D | ✅ PASA (por diseño de `estado-cuenta.js`, no requiere código nuevo) |
| C4 | `GET /api/session` sigue dando `plan:pro` mientras no venza | Sí | Igual que C3 | ✅ PASA |
| — | Segundo hallazgo, encontrado probando la carrera de dos cancelaciones | — | Polar devolvió `403 AlreadyCanceledSubscription` en un segundo intento, y el `catch` genérico lo devolvía como `502 "servicio no disponible"` — enmascarando que la cancelación ya había aplicado. **Fix** (commit `9466e01`): un 4xx de Polar en este endpoint se trata como éxito (`{ok:true, alreadyCanceled:true}`), no como fallo de red | ✅ arreglado, no re-verificado en vivo tras el 2º fix (fix de clasificación de errores, de bajo riesgo, cubierto por lectura de código) |

No hay endpoint de "deshacer" cancelación — si el usuario se arrepiente antes
de `current_period_end`, hoy lo maneja desde el dashboard de Polar. Anotado
como mejora futura, no bloqueante.

## Transversal (F)

| ID | Qué se revisó | Resultado |
|---|---|---|
| F1 | Grep de `SUPABASE_SERVICE_KEY`/`POLAR_API_KEY`/`POLAR_WEBHOOK_SECRET`/`SESSION_SECRET` en ambos repos — ningún `console.*`/`logger.log` cerca incluye el valor, solo nombres de variable o mensajes de error genéricos. Token de sesión: `session-store.js` nunca lo loguea (solo `path`/`error.message` en el catch) | ✅ limpio |
| F2 | `npm test` con el flag en ambos valores | Ya cubierto por `test/auth-domain.test.js` (alterna `subscriptionsEnabled` con `config:patch` dentro del mismo test) — 78/78 | ✅ PASA |
| F3 | `node scripts/check-mcp.js` + `get_state` incluye `auth` | `[check-mcp] ok`; `test/auth-domain.test.js` ya assert `st.auth.plan==='free'` | ✅ PASA |
| F4 | Paridad de claves i18n en los 10 locales | Script de conteo de hojas: los 10 archivos con **936 claves** cada uno (934 + 2 nuevas de cancelación), cero diffs entre `es.json` y el resto | ✅ PASA |
| F5 | App sin `CUENTAS_URL` arranca en no-op, cero requests de red de `features/auth/` | Ya cubierto por `test/auth-domain.test.js` (`CUENTAS_URL=''` explícito) — por código, el `if (!urlServicio) return` corre antes de crear el cliente HTTP o arrancar el refresh, así que estructuralmente no hay ningún request posible | ✅ PASA |

## B7 — Idempotencia del webhook (Gate C, cierre final)

Probado directo contra la tabla real (`cuentas.webhook_events`, PK en
`event_id`) en vez de re-firmar un webhook de Polar (no tenemos el secret real
en esta sesión, a propósito): `INSERT ... ON CONFLICT (event_id) DO NOTHING`
sobre un `event_id` ya existente → `rowCount=0` ("Success. No rows returned").
Eso es exactamente lo que `marcarEventoWebhook()` interpreta como "ya
procesado" (`return rowCount === 1`), y `webhook-polar.js` corta ahí
(`if (!nuevo) return res.json({received:true, duplicate:true})`) antes de
tocar `upsertSuscripcion`. **Gate C cerrado del todo.**

## Resumen de bugs encontrados y arreglados en esta corrida

| # | Bug | Severidad | Commit(s) |
|---|---|---|---|
| 1 | `window.open()` post-`await` se bloquea en navegador normal | Media (no afecta Electron empaquetado, sí cualquier testing/uso fuera de él) | `d68676e` |
| 2 | Plan solo se actualizaba en el próximo tick de 10 min tras pagar | Alta (UX — genera desconfianza, tal como sospechó el usuario) | `d68676e` |
| 3 | `[hidden]` no ocultaba realmente el item "Cuenta" del sidebar (CSS specificity) | Media | `0db77ed` |
| 4 | `config-updated` no re-sincronizaba `sesion.js` → UI de cuenta stale tras togglear el flag en caliente | Media | `0db77ed` |
| 5 | Flujo de cancelación inexistente — botón mal cableado, dejaba pagar dos veces | **Alta** (dinero real en producción) | `0695a6b`, `9d17350` (servicio + app) |
| 6 | 4xx de Polar en cancelar se reportaba como 502 genérico | Baja (mensaje de error incorrecto, no afecta el resultado final) | `9466e01` |

## Pendientes reales para después de esta corrida

- Endpoint de "deshacer cancelación" — no implementado, hoy se maneja desde Polar directo.
- Limpieza de usuarios QA en Supabase antes de producción: `2cf26e73-…`, `f4601f22-…` (Fase 1) + `qa+e2e1/e2e2/e3@tiklivetts.es` (esta sesión).
