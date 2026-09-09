# 02 — Contrato HTTP de `servicio-cuentas` (CONGELADO — Gate B)

Versión **1.1.0** (bump aditivo: `POST /api/subscription/cancel`, agregado en
la corrida de QA del Flujo C — 2026-09-09, ver `06-resultados-qa.md`).
Producido por el Agente 02. **Es lo único contra lo que programa el Agente 04**
(backend de la app) — no lee el código del servicio.

Cambios a este contrato tras el Gate B: solo aditivos en 1.x (ruta nueva,
campo opcional nuevo). Un cambio que rompe = 2.0.0 + nota en `HANDOFF.md` +
revisión del usuario.

- **Base URL (producción):** `https://cuentas.tiklivetts.es`
- **Repo:** `github.com/TikLiveTTS/servicio-cuentas` (código en `../servicio-cuentas` local)
- **Auth:** `Authorization: Bearer <token>` donde se indica. El token es opaco
  (fila en la tabla `sessions`), revocable en logout y en cambio de plan.
- **Formato de error (todas las rutas):**
  `{ "error": "<texto es>", "errorKey": "errors.<clave>" }` — el frontend
  prefiere `errorKey` (traducido con `tErr()`), cae a `error` crudo.
- **Estado de cuenta** (lo devuelven `register`, `login`, `session`):

```json
{
  "user": { "id": "<uuid>", "email": "<email>", "nombre": "<string>" },
  "plan": "free" | "pro",
  "entitlements": ["<featureId>", "..."],
  "subscription": null | {
    "status": "active" | "canceled" | "past_due" | "revoked" | "paused",
    "currentPeriodEnd": "<ISO8601>",
    "cancelAtPeriodEnd": true | false
  }
}
```

`register` y `login` agregan además `token` (string) y `expiresAt` (ISO8601) al
nivel raíz de la respuesta.

**Plan efectivo:** `plan` es `"pro"` sii existe una `subscription` del usuario
con `status ∈ {active, canceled}` **y** `currentPeriodEnd > now()`. En cualquier
otro caso, `"free"`. (Cancelada sigue dando acceso hasta el fin del período —
así funciona Polar.)

---

## Endpoints

### `POST /api/auth/register`

- Auth: no.
- Rate limit: 10 / 15 min / IP.
- Request: `{ "email": string, "password": string (>=8), "nombre": string }`
- `201`: estado de cuenta + `token` + `expiresAt`. Plan siempre `"free"`.
- Errores: `400 errors.invalidBody` (email inválido / falta campo),
  `400 errors.weakPassword`, `409 errors.emailTaken`, `429 errors.rateLimited`.

```bash
curl -X POST https://cuentas.tiklivetts.es/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"nuevo@ejemplo.com","password":"unaClave123","nombre":"Nuevo"}'
```

### `POST /api/auth/login`

- Auth: no.
- Rate limit: 5 / 15 min / IP.
- Request: `{ "email": string, "password": string }`
- `200`: estado de cuenta + `token` + `expiresAt`.
- Errores: `400 errors.invalidBody`, `401 errors.invalidCredentials`,
  `429 errors.rateLimited`.

```bash
curl -X POST https://cuentas.tiklivetts.es/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"nuevo@ejemplo.com","password":"unaClave123"}'
```

### `POST /api/auth/logout`

- Auth: Bearer.
- Request: sin body.
- `200`: `{ "ok": true }`. Invalida el token usado.
- Errores: `401 errors.unauthorized`.

```bash
curl -X POST https://cuentas.tiklivetts.es/api/auth/logout \
  -H 'Authorization: Bearer <token>'
```

### `GET /api/session`

- Auth: Bearer.
- `200`: estado de cuenta (sin `token`/`expiresAt`).
- Errores: `401 errors.unauthorized` (token ausente, inválido o expirado).

```bash
curl https://cuentas.tiklivetts.es/api/session -H 'Authorization: Bearer <token>'
```

### `GET /api/entitlements`

- Auth: Bearer.
- `200`: `{ "entitlements": ["<featureId>"] }`.
- Errores: `401 errors.unauthorized`.

### `PATCH /api/account`

- Auth: Bearer.
- Request: `{ "nombre": string }` — **solo nombre** en esta versión. Cambio de
  email/password es un flujo aparte (re-verificación), fuera de alcance 1.x.
- `200`: `{ "user": { "id", "email", "nombre" } }`.
- Errores: `400 errors.invalidBody`, `401 errors.unauthorized`.

```bash
curl -X PATCH https://cuentas.tiklivetts.es/api/account \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"nombre":"Nombre Nuevo"}'
```

### `POST /api/checkout`  *(implementa el Agente 03 — hoy responde 501)*

- Auth: Bearer.
- Request: `{ "plan": "pro" }`.
- `200`: `{ "url": "<checkout de Polar>" }`. La app abre esa URL en el navegador
  externo.
- Errores: `400 errors.invalidBody`, `401 errors.unauthorized`,
  `502 errors.polarUnavailable`, `501 errors.notImplemented` (hasta la Fase 2).
- Retorno de Polar: `success_url = https://cuentas.tiklivetts.es/checkout/ok?checkout_id={CHECKOUT_ID}`
  (querystring que ve la app al volver — ver `03-contrato-checkout.md`).

### `POST /api/subscription/cancel`  *(v1.1.0)*

- Auth: Bearer.
- Sin body. Cancela **al fin del período pagado** (`cancel_at_period_end=true`
  en Polar vía `PATCH /v1/subscriptions/{id}`) — reversible desde Polar hasta
  esa fecha, no revoca acceso inmediato. Usa el `polar_subscription_id` de la
  suscripción activa del usuario (mismo criterio de "plan efectivo" que
  `estado-cuenta.js`: `status IN ('active','canceled') AND current_period_end > now()`).
- `200`: `{ "ok": true }` (o `{ "ok": true, "alreadyCanceled": true }` si ya
  estaba programada). Actualiza `subscriptions.cancel_at_period_end` local de
  forma optimista, sin esperar el webhook de confirmación de Polar.
- Errores: `401 errors.unauthorized`, `404 errors.noActiveSubscription` (no
  hay suscripción vigente para cancelar), `502 errors.polarUnavailable`,
  `501 errors.notImplemented` (sin `POLAR_API_KEY`).
- No existe endpoint de "deshacer" propio — si el usuario se arrepiente antes
  de `current_period_end`, lo maneja desde el dashboard de Polar directamente.

### `POST /api/webhooks/polar`  *(implementa el Agente 03 — hoy responde 501)*

- Auth: firma `standardwebhooks` (no Bearer). Body **raw**.
- Lo llama Polar, no la app. Documentado acá solo para completar el mapa.
- `200 { "received": true }` / `403 errors.invalidSignature` / `501` (hasta Fase 2).

### `GET /api/health`

- Auth: no. Lo usa el healthcheck de Coolify.
- `200`: `{ "ok": true }`. `503 errors.notReady` si la DB no responde.

---

## Tabla de errores

| status | errorKey | Cuándo |
|---|---|---|
| 400 | `errors.invalidBody` | Falta un campo o formato inválido |
| 400 | `errors.weakPassword` | Password < 8 chars en `register` |
| 401 | `errors.unauthorized` | Token ausente / inválido / expirado |
| 401 | `errors.invalidCredentials` | Email o password incorrectos en `login` |
| 403 | `errors.invalidSignature` | Firma de webhook inválida |
| 404 | `errors.notFound` | Ruta inexistente |
| 409 | `errors.emailTaken` | Email ya registrado |
| 429 | `errors.rateLimited` | Rate limit excedido |
| 501 | `errors.notImplemented` | `checkout` / `webhook` antes de la Fase 2 |
| 502 | `errors.polarUnavailable` | Polar no respondió |
| 503 | `errors.notReady` | DB no disponible |
| 500 | `errors.internal` | Excepción no esperada (sin stack al cliente) |

El Agente 05 agrega estas `errors.*` a los 10 locales de la app.

---

## Anexo — Round-trip verificado ✅ (2026-09-08, contra `https://cuentas.tiklivetts.es`)

```
POST /api/auth/register {email nuevo}   → 201  plan:"free" entitlements:[] subscription:null + token
POST /api/auth/login    {mismo}         → 200  plan:"free" + token
GET  /api/session       (Bearer)        → 200  { user, plan:"free", entitlements:[], subscription:null }
PATCH /api/account      {nombre nuevo}  → 200  user.nombre = "QA Bot Editado"
GET  /api/session       (Bearer)        → 200  nombre nuevo reflejado
POST /api/auth/login    {pass malo}     → 401  { errorKey:"errors.invalidCredentials" }
POST /api/auth/logout   (Bearer)        → 200  { ok:true }
GET  /api/session       (Bearer viejo)  → 401  { errorKey:"errors.unauthorized" }   (token invalidado)
GET  /api/health                        → 200  { ok:true }
```

Smoke test local (sin DB) — pasa (`cd api && npm test`): 5/5.
Usuario de prueba QA eliminado tras la corrida (`DELETE FROM cuentas.users WHERE email LIKE 'qa+%'`).

---

## Notas de implementación para el Agente 04

- El servicio devuelve el **estado de cuenta completo** en `register`/`login`, así
  que `features/auth/` puede poblar `auth-session.json` sin una llamada extra a
  `/api/session` justo después.
- `expiresAt` viene del servidor; `refresh.js` de la app debe re-llamar
  `/api/session` antes de ese momento (o cada ~10 min, lo que ocurra primero).
- El servicio **no** tiene endpoint de "refresh token": cuando el token expira,
  la app fuerza re-login (muestra el formulario). El `SESSION_HOURS` default es
  720 (30 días), así que no es frecuente.
- `entitlements` puede venir vacío aunque `plan:"pro"` si el Agente 02 todavía no
  seedeó la tabla `entitlements` con `04-features-pro.md`. El Agente 04 no debe
  asumir que "pro ⇒ entitlements no vacío"; usa la lista tal cual llega.
