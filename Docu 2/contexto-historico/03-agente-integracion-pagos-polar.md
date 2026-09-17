# Agente 03 — Integración de pagos (Polar.sh)

## Objetivo

Implementar el flujo de suscripción con Polar.sh de punta a punta: crear el
producto/precio "Pro anual" en Polar, exponer el checkout desde `servicio-cuentas`,
recibir y procesar los webhooks de Polar (verificación de firma, idempotencia,
mapeo a la tabla `subscriptions` de Supabase), y un job de reconciliación que
corrige divergencias re-derivando el estado desde la API de Polar. Todo el trabajo
de este agente vive en `servicio-cuentas` — la app de escritorio no cambia.

## Dependencias explícitas

- **`01-hallazgos.md` §2** (agente 01): tools del MCP de Polar, flujo de checkout,
  eventos y firma de webhooks, si hay sandbox. **Si §2 dice que el MCP de Polar no
  cubre checkout/webhooks**, este agente usa la API REST de Polar desde
  `servicio-cuentas` (el MCP solo sirvió para crear el producto).
- **Gate B** cumplido: `02-contrato-http.md` congelado y `servicio-cuentas`
  desplegable con los stubs `checkout.js` / `webhook-polar.js` ya registrados.
- Tabla `subscriptions` y `webhook_events` existen (Gate A).

## Contrato de entrada

| Artefacto | De quién | Uso |
|---|---|---|
| `01-hallazgos.md` §2 | agente 01 | Nombres reales de eventos de Polar, algoritmo de firma, params de checkout. |
| `servicio-cuentas` (repo/carpeta) con stubs | agente 02 | Se le agregan `handlers/checkout.js`, `handlers/webhook-polar.js`, `jobs/reconciliar.js`, `polar/*.js`. |
| `02-contrato-http.md` | agente 02 | Formato de error uniforme, patrón de los handlers, `db/*.js` disponibles. |
| Fila `plans('pro', …, polar_product_id NULL)` en Supabase | agente 02 | Se completa `polar_product_id` tras crear el producto. |
| MCP Polar | sesión | Crear producto/precio; leer suscripciones para el job de reconciliación. |

## Contrato de salida

1. **Producto "Pro anual"** creado en Polar (modo test primero), con su
   `product_id` escrito en `plans.polar_product_id` (Supabase).
2. **`POST /api/checkout`** en `servicio-cuentas`: recibe `{ plan:'pro' }` + token
   de sesión, devuelve `200 { url }` con la URL de checkout de Polar, pasando
   `customer_email` del usuario y `success_url` de retorno.
3. **`POST /api/webhooks/polar`** en `servicio-cuentas`:
   - Verifica la firma del header (algoritmo de §2). Firma inválida → `401`, sin
     procesar.
   - Idempotencia: si `event_id` ya está en `webhook_events` → `200` sin re-procesar.
   - Mapea el evento a `subscriptions`: `created`/`active` → `status='active'` +
     `current_period_end`; `canceled` → `status='canceled'` (sigue activo hasta
     `current_period_end`); `revoked`/`past_due` → según §2.
   - Registra el `event_id` en `webhook_events`.
   - Loguea cada evento procesado.
4. **`jobs/reconciliar.js`** — corre por cron (pg_cron o cron del contenedor, según
   §1): recorre `subscriptions` con `polar_subscription_id`, consulta el estado
   real en Polar, corrige divergencias, loguea las correcciones.
5. **`03-contrato-checkout.md`** — 1 página: el endpoint de checkout, el querystring
   de retorno que usa Polar (`?checkout_id=…` o el real), y qué eventos de webhook
   mapean a qué `status`. Lo leen los agentes 04 y 05.
6. **Actualización de `02-contrato-http.md`**: los stubs 501 pasan a estar
   documentados como implementados (o se referencia `03-contrato-checkout.md`).

## Tareas

- [ ] **1.** Leer `01-hallazgos.md` §2 completo + `02-contrato-http.md`. Decidir:
  ¿MCP de Polar o API REST para checkout y webhooks? Anotar la decisión al principio
  de `03-contrato-checkout.md`.
- [ ] **2.** Crear el producto "Pro anual" en Polar en **modo test**: precio anual
  (el monto sale de `plans.precio_anual_centavos` que seedeó el agente 02, o se
  define acá y se actualiza la fila). Guardar `product_id` y `price_id`.
- [ ] **3.** `execute_sql` (MCP Supabase): `UPDATE plans SET polar_product_id='…' WHERE id='pro'`.
- [ ] **4.** Implementar `polar/cliente.js` en `servicio-cuentas`: `undici` fetch
  con base URL de Polar, API key desde `process.env.POLAR_API_KEY`, timeout con
  `AbortSignal.timeout`, retry/backoff estilo `features/telemetria/transport.js`.
- [ ] **5.** Implementar `polar/crear-checkout.js`: dado `{ product_id, customer_email, success_url }`
  → llama a Polar → devuelve `{ url }`. Manejar errores de Polar → mapear a error
  uniforme.
- [ ] **6.** Implementar `handlers/checkout.js` (reemplaza el stub 501): valida
  token (middleware del agente 02), busca el email del usuario, arma
  `success_url = https://<subdominio>/checkout/ok?checkout_id={CHECKOUT_ID}` (o el
  placeholder real de Polar), llama `polar/crear-checkout.js`, devuelve `{ url }`.
- [ ] **7.** Implementar `polar/verificar-firma.js`: implementación exacta del
  algoritmo de §2 (HMAC del raw body con `process.env.POLAR_WEBHOOK_SECRET`).
  **Requiere el raw body** — configurar el parser del server para conservarlo en
  esta ruta.
- [ ] **8.** Implementar `db/marcar-evento-webhook.js` y `db/estado-suscripcion-upsert.js`
  en `servicio-cuentas` (siguen el patrón `db/*.js` del agente 02).
- [ ] **9.** Implementar `handlers/webhook-polar.js` (reemplaza el stub 501):
  verificar firma → check idempotencia → `switch` sobre el tipo de evento →
  upsert en `subscriptions` → marcar `event_id` → `200`. Cualquier excepción no
  esperada → loguear + `500` (Polar reintenta).
- [ ] **10.** Configurar el endpoint de webhook en Polar (panel o MCP según §2)
  apuntando a `https://<subdominio>/api/webhooks/polar`. En desarrollo, usar el
  reenvío de webhooks de Polar o un túnel; documentar el procedimiento.
- [ ] **11.** Implementar `jobs/reconciliar.js` + su scheduling. Loguea
  `cuentas.reconciliacion.divergencia` por cada corrección.
- [ ] **12.** Definir la lógica de **plan efectivo**: `GET /api/session` (del
  agente 02) debe devolver `plan:'pro'` sii existe una `subscription` del usuario
  con `status IN ('active','canceled')` y `current_period_end > now()`. Coordinar
  con el agente 02 para que `db/estado-cuenta.js` implemente esta regla (delegación).
- [ ] **13.** Escribir `03-contrato-checkout.md`: endpoint de checkout, querystring
  de retorno, tabla evento Polar → `status`, y la regla de plan efectivo.
- [ ] **14.** Probar el flujo completo en modo test (delegar la parte de "pagar con
  tarjeta de prueba" si hace falta un navegador; ver Delegación) y verificar con
  `execute_sql` que `subscriptions` queda `active`. Reintentar el mismo webhook →
  confirmar que no duplica.
- [ ] **15.** Actualizar `HANDOFF.md`: agente 03 a "hecho", marcar **Gate C**
  (webhook probado) con la evidencia (query result + reintento sin duplicado).

## Criterios de "hecho"

1. `plans.polar_product_id` para `id='pro'` no es NULL (verificado con `execute_sql`).
2. `curl -X POST .../api/checkout -H 'Authorization: Bearer <token>' -d '{"plan":"pro"}'` devuelve `200 { url }` y la URL abre el checkout de Polar del producto correcto.
3. Un pago de prueba dispara un webhook que deja `subscriptions.status='active'` y `current_period_end` en el futuro para ese `user_id`.
4. Reenviar el mismo evento de webhook (`event_id` repetido) devuelve `200` y **no** cambia `subscriptions` ni agrega fila a `webhook_events`.
5. Un webhook con firma inválida devuelve `401` y no toca la DB.
6. Tras el pago, `GET /api/session` de ese usuario devuelve `plan:'pro'` con los `entitlements` correspondientes.
7. Un evento `canceled` deja `status='canceled'` pero `GET /api/session` sigue devolviendo `plan:'pro'` hasta `current_period_end`; después devuelve `free`.
8. `jobs/reconciliar.js` corre sin error y loguea (aunque no haya divergencias).
9. `03-contrato-checkout.md` existe con las 4 piezas (endpoint, querystring, mapa de eventos, regla de plan efectivo).
10. Grep de `POLAR_API_KEY` / `POLAR_WEBHOOK_SECRET` en el repo da solo `process.env`.
11. `HANDOFF.md` marca Gate C con evidencia.

## Delegación

| Tarea concreta a delegar | A qué subagente | Info mínima que le paso | Qué espero de vuelta |
|---|---|---|---|
| Implementar la regla de "plan efectivo" dentro de `db/estado-cuenta.js` | **agente 02** (dueño de `servicio-cuentas` DB) | "En `db/estado-cuenta.js`, `plan` = `'pro'` sii hay `subscription` del user con `status IN ('active','canceled')` y `current_period_end > now()`, si no `'free'`. `entitlements` = `SELECT feature_id FROM entitlements WHERE plan_id = <plan efectivo>`." | Confirmación de que `db/estado-cuenta.js` implementa esa regla + un test rápido. |
| Pagar con tarjeta de prueba en el checkout de Polar (tarea 14) | **auxiliar de navegador** (Browser pane) | La URL de checkout de la tarea 2, y los datos de tarjeta de prueba de Polar (de `01-hallazgos.md` §2). "Completá el checkout de prueba y confirmá que llega a la success_url." | Screenshot de la pantalla de éxito + la success_url final con su querystring. |
| Verificar el algoritmo de firma contra la doc de Polar (tarea 7) | **auxiliar de sondeo MCP** o `WebFetch` de la doc de Polar | El nombre del header de firma y "confirmá: algoritmo (HMAC-SHA256?), qué se firma (raw body?, timestamp?), formato del header." | El pseudocódigo exacto de verificación. |
| Redacción de `03-contrato-checkout.md` | **nadie** — lo hace el agente 03 | — | — |

Motivo: la regla de plan efectivo toca la DB que es dueña del agente 02 —
delegársela evita que 03 duplique lógica de acceso a datos. El pago de prueba
necesita un navegador que 03 no tiene en su contexto natural.

## Riesgos y rollback

- **Webhook perdido** (Polar reintenta y falla, o el servicio estaba caído) → el
  job de reconciliación lo corrige en la próxima corrida. Documentar la frecuencia
  del cron (sugerido: cada 6 h) en `03-contrato-checkout.md`.
- **Raw body para la firma** — si el parser JSON del server consume el body antes,
  la verificación de firma falla siempre. Aislar esa ruta con un parser `raw`
  específico. Es el bug más común de integraciones de webhook.
- **Modo test vs producción de Polar** — el `product_id` y las claves difieren.
  El switch es por env (`POLAR_ENV=test|production`); nunca hardcodear. Para la
  Fase 6, el agente de despliegue carga las claves de producción.
- **Doble cobro / checkout duplicado** — Polar maneja la idempotencia del pago; el
  servicio no crea suscripciones, solo las refleja. No implementar lógica de cobro
  propia.
- Rollback: `checkoutEnabled=false` (sub-flag) oculta el botón de upgrade; los
  webhooks se siguen procesando (no molesta); el producto de Polar se archiva. El
  registro gratis no se toca.
