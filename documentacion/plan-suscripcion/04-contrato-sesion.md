# 04 — Contrato de sesión (backend app ↔ frontend app)

Producido por el Agente 04. Lo lee el Agente 05 (frontend). Es la forma del
estado de sesión que el frontend consume y los endpoints `/api/auth/*` que la
app (no el servicio) expone.

## Dominio `features/auth/` — resumen

- Se monta en `server.js` **entre `configuracion` y `mcp`**.
- Resuelve la URL del `servicio-cuentas`: env `CUENTAS_URL` →
  `%APPDATA%/tiktok-live-tts/cuentas.json` campo `url` → bundled
  `cuentas-config.json`. Sin URL ⇒ dominio en **no-op** (igual que telemetría sin
  `TELEMETRY_URL`): las rutas `/api/auth/*` responden `503 errors.notReady`, el
  contrato `auth:get` devuelve sesión vacía, `entitlements.check()` respeta
  `subscriptionsEnabled`.
- Store de sesión: `DATA_BASE/auth-session.json` (patrón `auth-tokens-store.js`).
- Feature flag `subscriptionsEnabled` en `config.json` (default `false`).

## Objeto de sesión (lo devuelven `/api/auth/session`, y `bus.emit('auth:get')`)

```json
{
  "signedIn": true,
  "user": { "id": "<uuid>", "email": "<email>", "nombre": "<string>" },
  "plan": "free" | "pro",
  "entitlements": ["bot-musical", "soundpad", "..."],
  "expiresAt": "<ISO8601>",
  "subscription": null | {
    "status": "active" | "canceled" | "past_due" | "revoked" | "paused",
    "currentPeriodEnd": "<ISO8601>",
    "cancelAtPeriodEnd": true | false
  },
  "degraded": false
}
```

- `signedIn:false` ⇒ el resto de los campos van en su cero (`user:null`,
  `plan:"free"`, `entitlements:[]`).
- `degraded:true` ⇒ el `servicio-cuentas` no respondió; se está usando el último
  estado cacheado. Pasado el TTL de gracia, `features/auth/` degrada a
  `plan:"free"` (fail-safe: nunca desbloquea Pro sin confirmación del servidor).

## Endpoints que expone la app (`features/auth/routes/`)

Todos detrás de `subscriptionsEnabled` (si `false` → `404`). La app es el proxy;
`servicio-cuentas` es el que habla con Supabase/Polar.

| Método | Ruta (app) | Request | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password, nombre }` | `200` objeto de sesión (con `signedIn:true`) |
| POST | `/api/auth/login` | `{ email, password }` | `200` objeto de sesión |
| POST | `/api/auth/logout` | — | `200 { ok:true }` |
| GET | `/api/auth/session` | — | `200` objeto de sesión |
| PATCH | `/api/auth/account` | `{ nombre }` | `200` objeto de sesión |
| POST | `/api/auth/checkout` | `{ plan:"pro" }` | `200 { url }` (proxy a `servicio-cuentas`, agrega el token) |

Errores: se propaga el `{ error, errorKey }` de `servicio-cuentas` tal cual
(`errors.emailTaken`, `errors.invalidCredentials`, `errors.unauthorized`,
`errors.polarUnavailable`, …). El frontend traduce con `tErr()`.

El **token** de sesión vive solo en `auth-session.json` (backend de la app). El
frontend **nunca** lo ve — solo recibe el objeto de sesión.

## Contrato de bus (para otros dominios de la app)

| Evento | Dirección | Payload |
|---|---|---|
| `auth:get` | otro dominio → `features/auth/` (síncrono, callback) | `bus.emit('auth:get', (sesion) => …)` — devuelve el objeto de sesión actual |
| `auth:actualizado` | `features/auth/` → bus | `{ signedIn, plan }` — al cambiar login o plan |
| `ws:broadcast {type:'auth-updated'}` | `features/auth/` → `core/broadcast.js` → renderer | `{ type:'auth-updated', session: <objeto de sesión, sin token> }` |

## Contrato de gating `core/contracts/entitlements.js`

Singleton (patrón `moderacion-policy.js` / `mcp-registry.js`), inyectado por
`features/auth/`. Otros dominios: `const entitlements = require('../../core/contracts/entitlements')`.

```
entitlements.check(featureId) → boolean
```

- `subscriptionsEnabled === false` → siempre `true` (comportamiento actual).
- `subscriptionsEnabled === true` → `sesion.entitlements.includes(featureId)`.
- Lanza → `false` (fail-safe: bloquea). **Excepción `sin-promos`**: fail-safe a
  `false` = "no tiene el entitlement" = los avisos SÍ suenan (comportamiento
  actual). Coherente sin caso especial en el código.

## Para el frontend (Agente 05)

- Slice `nucleo/estado/sesion.js` con `crearAlmacen({ signedIn:false, user:null,
  plan:'free', entitlements:[], expiresAt:null })`.
- `cargarSesion()` = `GET /api/auth/session` al arrancar (después de
  `loadRuntimeConfig()`).
- `cliente-ws.js`: `case 'auth-updated': aplicarSesion(data.session)`.
- Helper `estaDesbloqueada(featureId)` = `plan==='pro' && entitlements.includes(id)`
  — o directamente `!subscriptionsEnabled || entitlements.includes(id)`.
- Checkout: `POST /api/auth/checkout` → abrir `{url}` en navegador externo. Al
  volver, si `plan` sigue `free` tras ~8s de polling suave a `cargarSesion()`,
  mostrar "Confirmando tu pago…".
