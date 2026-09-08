# 03 — Contrato de checkout y webhooks (Polar)

Producido por el Agente 03. Lo leen los agentes 04 (backend app) y 05 (frontend).
Decisión: **API REST de Polar**, no MCP (no hay MCP de Polar — ver `01-hallazgos.md` §2).

## Entornos

| | Sandbox (ahora) | Producción (Fase 6) |
|---|---|---|
| API base | `https://sandbox-api.polar.sh/v1` | `https://api.polar.sh/v1` |
| Dashboard | `https://sandbox.polar.sh` | `https://polar.sh` |
| Switch | env `POLAR_ENV` en `servicio-cuentas` (`test` / `production`) | |
| Org | `TikLiveTTS Sandbox` (`f3256c11-d447-43c2-ac20-2eceee46f424`) | `TikLiveTTS` (`088bfba1-…`) |
| Producto Pro anual | `e68ddd7f-e954-4e8f-9c13-7bc7f2393a07` (US$85/año) | crear en Fase 6 |

El OAT de Polar es un **organization token**: nunca se pasa `organization_id` en
el body, Polar lo infiere.

## Endpoint de checkout — lo consume el frontend vía el backend de la app

```
POST https://cuentas.tiklivetts.es/api/checkout
Authorization: Bearer <token de sesión>
{ "plan": "pro" }
→ 200 { "url": "https://sandbox.polar.sh/…/checkout/…" }
→ 502 { errorKey: "errors.polarUnavailable" }   (Polar no respondió)
→ 501 { errorKey: "errors.notImplemented" }     (Polar no configurado en el server)
```

`servicio-cuentas` arma el checkout con:
- `products: [POLAR_PRODUCT_ID_PRO_ANUAL]`
- `customer_email` = email del usuario
- `external_customer_id` = **nuestro `users.id`** → Polar lo devuelve como
  `customer.external_id` en todos los webhooks (reconciliación directa, sin tabla
  de correspondencia)
- `success_url = https://cuentas.tiklivetts.es/api/checkout/ok?checkout_id={CHECKOUT_ID}`

## Flujo para la app (agente 05)

1. Usuario `free` aprieta "Hazte Pro" → la app llama `POST /api/auth/checkout`
   (proxy del backend de la app al `/api/checkout` del servicio, agregando el token).
2. La app abre `url` en el **navegador externo** (`window.js` de Electron manda
   toda URL no-local afuera — comportamiento deseado).
3. El usuario paga en Polar. Polar redirige a `.../api/checkout/ok?checkout_id=…`
   → página HTML mínima "Pago recibido, volvé a la app".
4. En paralelo, Polar dispara el **webhook** → `servicio-cuentas` refleja la
   suscripción en la tabla `subscriptions`.
5. La app, al volver: `refresh.js` (agente 04) re-consulta `/api/session`. Mientras
   `plan` siga `free`, la UI muestra "Estamos confirmando tu pago…" y reintenta
   unos segundos.

**Querystring de retorno:** `?checkout_id=<uuid>`. La app no lo necesita para
nada funcional (el estado real llega por `/api/session`); solo sirve como señal
de "el usuario volvió del checkout".

## Webhook — `POST /api/webhooks/polar` (lo llama Polar, no la app)

- **Firma**: estándar `standardwebhooks`. El secreto de Polar (`polar_whs_…`) se
  **base64-encodea entero** antes de verificar. Requiere el **raw body**
  (`express.raw`, montado antes del `express.json` global). Firma inválida → `403
  errors.invalidSignature`.
- **Idempotencia**: `webhook_events(event_id pk)`. Evento repetido → `200
  {received:true, duplicate:true}` sin re-procesar.
- **Endpoint configurado en Polar** (sandbox): apuntando a
  `https://cuentas.tiklivetts.es/api/webhooks/polar`, eventos `subscription.*`.

### Eventos → estado en `subscriptions`

| Evento Polar | Acción |
|---|---|
| `subscription.created` / `subscription.active` | `status = data.status` (`active`), `current_period_end`, `cancel_at_period_end` |
| `subscription.updated` | **catch-all** — re-lee todo el objeto y refleja |
| `subscription.canceled` | `status='canceled'` — **sigue dando Pro hasta `current_period_end`** |
| `subscription.uncanceled` | `status='active'`, `cancel_at_period_end=false` |
| `subscription.past_due` | `status='past_due'` |
| `subscription.revoked` | `status='revoked'` → plan efectivo `free` ya |

Mapeo del user: `data.customer.external_id` → `users.id`. Fallbacks:
`data.metadata.user_id`, luego lookup por `data.customer.email`.

### Regla de plan efectivo (en `db/estado-cuenta.js`)

```
plan = 'pro'  si existe subscription del user con
                status IN ('active','canceled') AND current_period_end > now()
       'free' en cualquier otro caso
entitlements = SELECT feature_id FROM entitlements WHERE plan_id = <plan efectivo>
```

## Reconciliación

`jobs/reconciliar.js` corre cada `RECONCILE_EVERY_HOURS` (default 6) + al arrancar.
Recorre las `subscriptions` con `polar_subscription_id` y status vivo, consulta
`GET /v1/subscriptions/{id}` en Polar, y si `status` o `current_period_end`
difieren, hace `upsert` y loguea `[reconciliar] divergencia …`. Red de seguridad
ante un webhook perdido.

## Env vars nuevas en `servicio-cuentas` (Coolify)

| Var | Valor (sandbox) |
|---|---|
| `POLAR_API_KEY` | el OAT de sandbox (`polar_oat_…`) |
| `POLAR_WEBHOOK_SECRET` | el `polar_whs_…` que genera Polar al crear el endpoint |
| `POLAR_PRODUCT_ID_PRO_ANUAL` | `e68ddd7f-e954-4e8f-9c13-7bc7f2393a07` |
| `POLAR_ENV` | `test` |

## Prueba de pago (para el agente 06)

Modo sandbox de Polar: tarjeta de prueba `4242 4242 4242 4242`, cualquier fecha
futura, cualquier CVC. Tras confirmar, Polar dispara los webhooks reales contra
`cuentas.tiklivetts.es`. Verificar con `SELECT * FROM cuentas.subscriptions`.
