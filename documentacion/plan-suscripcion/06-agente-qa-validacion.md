# Agente 06 — QA / validación end-to-end

## Objetivo

Probar los flujos completos del sistema de suscripción de punta a punta, con la
app real y el `servicio-cuentas` real (modo test de Polar): usuario nuevo gratis,
upgrade a Pro, cancelación, expiración, y el gating on/off. Producir
`06-resultados-qa.md` con veredicto por flujo. Cuando algo falla, no lo arregla —
lo reporta con el detalle mínimo para que el orquestador re-despache al agente
dueño de esa pieza.

## Dependencias explícitas

- Fases 1–4 cerradas: Gates A, B, C, D todos en verde en `HANDOFF.md`.
- `servicio-cuentas` desplegable localmente o en un entorno de staging, apuntando
  al Supabase del VPS y a Polar en **modo test**.
- Build de la app con la rama de `features/auth/` + la del frontend integradas
  (aunque sin mergear a `main`), con `subscriptionsEnabled` alternable.
- `01-hallazgos.md` §2 — procedimiento de pago con tarjeta de prueba de Polar.

## Contrato de entrada

| Artefacto | De quién | Uso |
|---|---|---|
| `02-contrato-http.md`, `03-contrato-checkout.md`, `04-contrato-sesion.md`, `04-features-pro.md` | agentes 02–04 | Comportamiento esperado de cada pieza; criterios de "hecho" de cada agente como base de los casos de prueba. |
| `00-ORQUESTADOR.md` — sección "Manejo de errores y rollback" | orquestador | Casos de rollback a validar (flag maestro, webhook idempotente, degradación a free). |
| Acceso `execute_sql` (MCP Supabase) | sesión | Verificar el estado real en `subscriptions` / `webhook_events`. |
| Browser pane | sesión | Completar checkout de prueba, inspeccionar la UI. |

## Contrato de salida

**`documentacion/plan-suscripcion/06-resultados-qa.md`** con una fila por caso:
`ID | flujo | pasos | resultado esperado | resultado real | veredicto (PASA/FALLA) | agente a re-despachar si FALLA`.
Más una sección "Bugs abiertos" con repro mínimo por cada FALLA.

## Casos de prueba

### Flujo A — Usuario nuevo gratis

- [ ] **A1.** App con `subscriptionsEnabled=true`, sin sesión → la vista "Cuenta"
  muestra registro/login; el resto de la app funciona normal.
- [ ] **A2.** Registro con email nuevo → `201`, sesión iniciada, perfil muestra
  `plan: free`. `execute_sql`: fila en `users`, sin fila en `subscriptions`.
- [ ] **A3.** Cerrar y reabrir la app → la sesión persiste (`auth-session.json`),
  el perfil sigue logueado.
- [ ] **A4.** Las features de `04-features-pro.md` muestran candado + CTA. El
  núcleo (TTS, chat multi-plataforma, moderación) funciona sin restricción.
- [ ] **A5.** Registro con un email ya usado → `409`, toast traducido
  (`errors.emailTaken`), sin sesión.
- [ ] **A6.** Login con password incorrecto → `401`, toast `errors.invalidCredentials`.

### Flujo B — Upgrade a Pro

- [ ] **B1.** Usuario free → botón "Hazte Pro" → `POST /api/auth/checkout` →
  abre el checkout de Polar del producto correcto en el navegador externo.
- [ ] **B2.** Completar el pago con tarjeta de prueba → Polar redirige a la
  `success_url`.
- [ ] **B3.** Webhook de Polar → `servicio-cuentas` → `execute_sql`:
  `subscriptions.status='active'`, `current_period_end` ~1 año en el futuro.
- [ ] **B4.** En la app (sin reiniciar): tras el `refresh` (o el aviso "confirmando
  pago"), el estado pasa a `plan: pro`, aparece el badge "PRO", los candados
  desaparecen.
- [ ] **B5.** `get_state` (MCP) del backend de la app muestra `auth.plan='pro'` y
  los `entitlements` correctos.
- [ ] **B6.** Las features antes gateadas ahora responden `200` (no `403`).
- [ ] **B7.** Reenviar manualmente el mismo webhook (`event_id` repetido) → `200`,
  sin cambios en `subscriptions`, sin fila nueva en `webhook_events`.

### Flujo C — Cancelación

- [ ] **C1.** Usuario pro → "Gestionar suscripción / Cancelar" → flujo de
  cancelación de Polar (portal o endpoint, según `03-contrato-checkout.md`).
- [ ] **C2.** Webhook `canceled` → `execute_sql`: `subscriptions.status='canceled'`,
  `current_period_end` intacto.
- [ ] **C3.** En la app: el usuario **sigue** viendo `plan: pro` y sin candados
  hasta `current_period_end` (cancelación no es revocación inmediata). El perfil
  indica "se cancela el <fecha>".
- [ ] **C4.** `GET /api/session` devuelve `plan: pro` mientras `current_period_end > now()`.

### Flujo D — Expiración

- [ ] **D1.** Forzar `current_period_end` al pasado con `execute_sql` (simular fin
  de período) en una suscripción `canceled`.
- [ ] **D2.** `GET /api/session` ahora devuelve `plan: free`.
- [ ] **D3.** En la app tras el `refresh`: badge "PRO" desaparece, candados
  vuelven, las features gateadas responden `403`.
- [ ] **D4.** El job de reconciliación corre y no revierte el cambio (Polar
  también reporta expirado).

### Flujo E — Gating y rollback

- [ ] **E1.** `PATCH /api/config {subscriptionsEnabled:false}` en caliente → la app
  vuelve al comportamiento actual: sin candados, features Pro abiertas, la vista
  Cuenta oculta/vacía según lo acordado con el agente 05. Sesión no se borra.
- [ ] **E2.** Volver a `true` → el estado de plan se re-aplica correcto (free ve
  candados, pro no).
- [ ] **E3.** `servicio-cuentas` caído (apagarlo) + usuario pro con sesión válida
  → dentro del TTL de gracia sigue viendo Pro; pasado el TTL degrada a free y
  loguea `auth.sesion.expirada`. Al revivir el servicio, vuelve a Pro.
- [ ] **E4.** `features/auth/` con config corrupta (`cuentas.json` inválido) → la
  app arranca igual, loguea `core.dominio.fallo_montaje`, el resto de dominios OK.
- [ ] **E5.** Firma de webhook inválida → `401`, `subscriptions` sin tocar.

### Transversal

- [ ] **F1.** Grep de secrets en los repos (`SUPABASE_SERVICE_KEY`, `POLAR_API_KEY`,
  `POLAR_WEBHOOK_SECRET`, token de sesión) → solo `process.env` / `DATA_BASE`,
  nunca en logs, telemetría ni GlitchTip.
- [ ] **F2.** `npm test` de la app pasa con `subscriptionsEnabled` en ambos valores.
- [ ] **F3.** `node scripts/check-mcp.js` pasa; `get_state` incluye `auth`.
- [ ] **F4.** Paridad de claves i18n en los 10 locales.
- [ ] **F5.** La app sin `CUENTAS_URL` configurada (build "vanilla") arranca en
  no-op, cero requests de red de `features/auth/`.

## Criterios de "hecho"

1. `06-resultados-qa.md` tiene una fila por cada caso A1–F5 con veredicto.
2. Todo FALLA tiene repro mínimo y el agente responsable anotado.
3. Los 4 flujos de negocio (A, B, C, D) pasan de punta a punta al menos una vez.
4. El rollback por flag (E1/E2) y la degradación por servicio caído (E3) pasan.
5. La idempotencia del webhook (B7) y la firma inválida (E5) pasan.
6. No hay ningún FALLA de severidad "bloquea release" sin un plan de fix acordado
   con el orquestador.
7. `HANDOFF.md` refleja el resultado global y, si aplica, los re-despachos.

## Delegación

| Tarea concreta a delegar | A qué subagente | Info mínima que le paso | Qué espero de vuelta |
|---|---|---|---|
| Completar el checkout de prueba en el navegador (B1–B2) | **auxiliar de navegador** (Browser pane) | URL de checkout + datos de tarjeta de prueba de `01-hallazgos.md` §2. | Screenshot de éxito + la `success_url` con querystring. |
| Verificar estado en Supabase tras cada webhook (B3, C2, D1) | `execute_sql` (MCP, tool directa) | La query concreta (`SELECT status, current_period_end FROM subscriptions WHERE user_id=…`). | El resultado de la query. |
| Reproducir un FALLA que parece de backend de la app | **agente 04** (con el repro de QA como único contexto) | El caso que falla, los pasos, el resultado real vs esperado, y el log relevante. Nada más del historial. | Diagnóstico + fix + confirmación de que el caso ahora pasa. |
| Reproducir un FALLA que parece de `servicio-cuentas` / Polar | **agente 02** o **agente 03** según la pieza | Igual que arriba, acotado a esa pieza. | Igual. |
| Redacción de `06-resultados-qa.md` | **nadie** — lo hace el agente 06 | — | — |

Motivo: QA no arregla, delega el fix al dueño con el contexto mínimo (el repro),
para que ese agente no arrastre todo el historial del proyecto en su ventana.

## Riesgos y rollback

- **Datos de prueba en Supabase de producción** — el Supabase del VPS es el real.
  Los usuarios de prueba se crean con un prefijo reconocible (`qa+<algo>@…`) y se
  limpian al final con `execute_sql` (DELETE acotado por prefijo). Documentar la
  limpieza en `06-resultados-qa.md`.
- **Pago de prueba que se cobra de verdad** — usar **siempre** el modo test de
  Polar y tarjetas de prueba. Confirmar el `POLAR_ENV=test` antes de B1.
- **Falso PASA por caché** — entre casos, forzar `cargarSesion()` / reiniciar la
  app para no arrastrar estado viejo.
- QA no deja estado de código; su "rollback" es limpiar los datos de prueba.
