# 07 — Auditoría de seguridad (transición local → cuentas)

Ejecutada 2026-09-09 con la skill `security-review` (identificación → filtrado
de falsos positivos en sub-tareas paralelas → umbral de confianza ≥ 8/10).
Alcance: branch `feat/suscripciones-auth` (app) + repo `servicio-cuentas`
(backend internet-facing).

## Resultado: 3 hallazgos confirmados — 2 HIGH, 1 MEDIUM. NINGUNO arreglado todavía.

---

## Vuln 1 — HIGH — Bypass del muro de login por mayúsculas en la ruta

- **Archivo:** `core/guard-suscripcion.js:23-24` (app)
- **Categoría:** `auth_bypass` · **Confianza:** 9/10
- **Descripción:** el guard chequea `req.path.startsWith('/api/')` y
  `startsWith('/api/auth/')` **case-sensitive**. Express enruta
  **case-insensitive por defecto** (`case sensitive routing` no se setea en
  `core/app.js` ni en ningún lado). Request a `GET /API/config`,
  `PATCH /API/config`, `POST /API/platforms/connect`, etc.:
  1. falla `startsWith('/api/')` → `return next()` inmediato → **se salta todo
     el muro** (el 401 de `subscriptionsEnabled && !signedIn`),
  2. Express igual despacha `/API/…` al handler real en minúsculas.
- **Exploit:** con `subscriptionsEnabled=true`, un usuario local sin cuenta /
  deslogueado corre `curl http://localhost:3000/API/config` (o cualquier ruta
  `/api/*` no-Pro con una letra en mayúscula) y accede sin auth. Anula la
  captura de cuentas del modelo freemium. Percent-encoding y trailing-slash NO
  bypassean — solo el casing.
- **Fix:** normalizar arriba del guard:
  `const p = (req.path || '/').toLowerCase().replace(/\/+$/, '') || '/';`
  y comparar `startsWith` + `ABIERTAS.has(\`${req.method} ${p}\`)` contra `p`.
  Además `app.set('case sensitive routing', true)` en `core/app.js` como
  defensa en profundidad. Test nuevo en `test/auth-domain.test.js`:
  `GET /API/config` con flag on + sin sesión → 401.

---

## Vuln 2 — HIGH — Rate-limit de login/registro anulable con `X-Forwarded-For` falso

- **Archivos:** `servicio-cuentas` `api/src/index.js:22` (`app.set('trust proxy', config.trustProxy)`),
  `api/src/config.js:46` (`trustProxy` default `true`), `api/src/middleware/rate-limit.js:10` (`const ip = req.ip`)
- **Categoría:** `broken_auth` · **Confianza:** 9/10
- **Descripción:** `trust proxy` = booleano `true` → Express toma `req.ip` =
  **primer** valor de `X-Forwarded-For` (controlado por el atacante; Traefik
  agrega el IP real al final pero Express devuelve el primero). El limitador
  casero keyea su `Map` sobre `req.ip` → valor falso distinto por request =
  contador nunca llega al techo.
- **Exploit:** `POST https://cuentas.tiklivetts.es/api/auth/login` en loop, cada
  request con `X-Forwarded-For: <ip-random>`. El "5 intentos/15min" (única
  protección contra fuerza bruta en login) nunca se dispara → credential
  stuffing / fuerza bruta contra cualquier cuenta. Idem `register` (10/15min) →
  creación ilimitada + enumeración de emails.
- **Fix:** `app.set('trust proxy', 1)` (confiar 1 hop = el IP que agregó
  Traefik). Y keyear el limitador de login también sobre el `email`
  normalizado, no solo el IP. **Es en el repo `servicio-cuentas`, deploy en
  Coolify.**

---

## Vuln 3 — MEDIUM — Email + user-id de la cuenta se emiten a todos los clientes WS de la LAN

- **Archivos:** `features/auth/refresh.js` (`emitirCambio`), `features/auth/routes.js`
  (register/login/logout), `features/auth/index.js:94` (auth_logout MCP),
  `core/broadcast.js`, `core/ws-server.js` (app)
- **Categoría:** `sensitive_data_exposure` · **Confianza:** 8/10
- **Descripción:** en cada login/refresh/logout/cambio-de-plan/flip-degradado,
  `auth` emite `bus.emit('ws:broadcast', { type:'auth-updated', session: estado.getSesion() })`.
  `getSesion()` incluye `user.{id,email,nombre}`, `plan`, `subscription`,
  `expiresAt`. `core/broadcast.js` lo manda a **todos** los clientes WS.
  `core/ws-server.js#isAllowedWsClient` admite cualquier IP privada de la LAN
  (necesario para overlays de OBS / móvil), sin auth de sesión en el WS.
  El **token NO va** en el payload (verificado — OK).
- **Exploit:** alguien en la LAN del streamer abre `ws://<ip>:3000/` y recibe
  pasivamente el email + UUID de Supabase + plan + fin de período en el próximo
  refresh (cada 10 min; `degraded` flippea con cada blip de red). PII nueva de
  este branch.
- **Fix:** sacar identidad del broadcast — mandar solo
  `{ type:'auth-updated', session: { signedIn, plan, entitlements, degraded } }`
  y que el renderer haga `GET /api/auth/session` (ya solo-localhost) al ver el
  evento. Tocar: el objeto que pasan `refresh.js#emitirCambio`, `routes.js` (3
  handlers) e `index.js:94`. `sesion.js#aplicarSesion` en el frontend ya
  normaliza, pero `cliente-ws.js` case `auth-updated` pasa `data.session` — con
  el payload recortado, el perfil (email/nombre en la vista Cuenta) hay que
  refrescarlo con un `cargarSesion()` en ese case.

---

## Descartados tras el filtro (confianza < 8 — NO accionar, anotados para contexto)

| Candidato | Conf | Por qué |
|---|---|---|
| `/api/auth/` exime el OAuth de Twitch de `features/canales` | 3/10 | `oauthStart` no otorga nada; `oauthDisconnect` es POST solo-localhost. Igual conviene: cambiar el prefijo por match exacto de las 6 rutas de `/api/auth/*` en `guard-suscripcion.js`. |
| Enumeración de emails en `/register` (409 `emailTaken`) | 6/10 | Inherente a signups que rechazan duplicados; en el contrato congelado. Se mitiga solo con la Vuln 2. |
| Pepper después de la contraseña (límite 72 bytes de bcrypt) | 3/10 | Para contraseñas típicas sobra pepper. Igual: pre-hashear con HMAC-SHA256 antes de bcrypt + cost 12. `servicio-cuentas api/src/auth/hash-password.js`. |
| Tokens de sesión en texto plano como PK en `sessions` | 3/10 | 256 bits, sin ruta de exposición real. Defensa en profundidad: `sha256(token)`. |
| Idempotency key del webhook = `undefined` | 2/10 | Bug de confiabilidad, no seguridad. **Arreglar antes de producción de Polar (Fase 6):** keyear sobre el header `webhook-id`. `servicio-cuentas api/src/routes/webhook-polar.js`. |
| CORS `PUBLIC_ORIGIN=*` (default) | 4/10 | Sin `Allow-Credentials` + bearer (sin cookies) → no monta sesión ajena. Igual: setear `PUBLIC_ORIGIN` real en `docker-compose.yml` / `.env`. |

## Revisado y limpio (no tocar)

SQL injection (todo parametrizado; `DB_SCHEMA` regex-validado) · IDOR /
mass-assignment (`user_id` siempre del token; `actualizarCuenta` solo escribe
`nombre`) · middleware de auth fail-closed · firma del webhook (`express.raw`
antes de `express.json()`; `resolverUserId` solo sobre payload verificado) ·
`entitlements.check` fail-**closed** en throw · token nunca al renderer/WS/logs ·
XSS vista de cuenta (`esc()` cubre `& < > "`, suficiente para `value="..."`) ·
`undici`→`fetch` global sin regresión TLS · proxy `/api/auth/*` sin SSRF, CSRF
cubierto por `validateLocalMutation`.

---

## Estado de aplicación

- [x] Vuln 1 — fix en `core/guard-suscripcion.js` + `core/app.js` + test (2026-09-09)
- [x] Vuln 3 — recorte del payload `auth-updated` (`estado-sesion.js#getSesionPublica`, `refresh.js`, `index.js`, `cliente-ws.js`) (2026-09-09)
- [x] Vuln 2 — `servicio-cuentas` `trust proxy: 1` + `keyFn` por email en login (código + tests, 2026-09-09) — **falta el redeploy en Coolify**
- [ ] Descartados: aplicar los "igual conviene" antes de Fase 6 (contraseña pepper, webhook idempotency, CORS)
