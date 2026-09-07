# Fase 1 — /core (kernel)

## Objetivo
Construir el sostén sobre el que se montan todos los dominios: servidor HTTP/WS, bus de eventos, logger con el esquema nuevo, aislamiento de fallos por dominio. Sin esto, ningún dominio de la Fase 2 en adelante tiene dónde registrarse.

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/core (kernel — no es un dominio, es el sostén)` — lista exacta de archivos y su rol.
- `arquitectura-propuesta.md`, sección "Contratos entre módulos — resumen" — los 4 contratos (bus, contratos síncronos inyectados, estado propio por dominio, fallo aislado) que `/core` tiene que hacer cumplir mecánicamente, no por convención.
- `logging-errores-propuesta.md`, sección `/core` — eventos exactos de `core.logger.*`, `core.http.*`, `core.ws.*`, `core.dominio.*`, `core.boundary.*`, `core.bus.*`, y las 9 reglas duras del encabezado (especialmente regla 1: ningún `level=error` sin `stack`, y regla 4: cero `console.*` sueltos).
- `mapa-funciones-actual.md`, sección "Sin clasificar / infraestructura transversal" — funciones actuales equivalentes a reescribir con el contrato nuevo: `getRequestHostname`/`isLocalHostname` (server.js:37/44), `broadcast()` (server.js:1457), `log()` (server.js:994).

## Alcance — archivos a crear

```
core/
  app.js
  http-server.js
  ws-server.js
  event-bus.js
  register-domain.js
  error-boundary.js
  logger.js
  broadcast.js
  paths.js
  shutdown.js
  security/
    is-local-request.js
    is-private-ip.js
  contracts/
    moderacion-policy.js     (interfaz vacía, se implementa en Fase 5)
    idioma-filtrar.js        (interfaz vacía, se implementa en Fase 3)
```

## Detalle por archivo

### core/logger.js
Firma: `log(level, domain, function, event, message, data)`. Debe:
- Si `data` es un `Error` o contiene uno (`data.error instanceof Error` o similar), **extraer `stack` automáticamente** — el caller nunca tiene que acordarse de pasarlo. Esto fixea el hallazgo #1 de `logging-errores-propuesta.md`: hoy `telemetryBus.emit('error:handled', {stack: data && data.stack})` (server.js:1005) depende de que cada call-site pase `data.stack`, y casi ninguno lo hace → 95% de errores llegan sin traza.
- Escribir a: buffer en memoria (equivalente a `serverLogs`, cap configurable, emitir `core.logger.buffer_lleno` al alcanzar el cap), stream de archivo de sesión, y disparar `bus.emit('error:handled'|'error:uncaught', ...)` cuando `level` sea `error`/`fatal`.
- **Nunca fallar en silencio si el stream de archivo no se puede escribir** — este es el bug más grave encontrado (server.js:161/1017, hoy `catch(_){}`): si falla, ningún log posterior de la sesión llega al archivo que se adjunta en reportes de bug. Emitir `core.logger.escritura_fallida` (error) y, si es posible, seguir escribiendo al buffer en memoria aunque el disco falle.
- Prohibido usar `console.log`/`console.error` fuera de este archivo — `core/logger.js` es el único lugar del repo con permiso de tocar `console.*` directo (como fallback de última instancia si ni el bus ni el archivo están disponibles).

### core/event-bus.js
`EventEmitter` de Node envuelto: `bus.emit(event, payload)`, `bus.on(event, handler)`. Todo `handler` se envuelve automáticamente para que una excepción dentro de un listener no interrumpa a los demás listeners del mismo evento ni al emisor — capturar y emitir `core.bus.listener_fallido` con `{event, domainListener, error, stack}`.

### core/register-domain.js
`registerDomain({app, wss, bus, logger, config}, domainIndex)`:
- Llama `domainIndex.register(deps)` dentro de try/catch.
- Éxito: `core.dominio.montado` con `{domain, rutas, listeners}`.
- Fallo: `core.dominio.fallo_montaje` con `{domain, error, stack}` — **el proceso sigue vivo**, los demás dominios se montan igual. Esta es la prueba observable de que el aislamiento de fallos funciona (contrato #4 de arquitectura-propuesta.md).
- Si `domainIndex.shutdown` existe, se registra en `core/shutdown.js` para el cierre ordenado.

### core/error-boundary.js
`wrap(handler)` para rutas Express y listeners de bus: try/catch → si lanza, `core.boundary.excepcion_capturada` con `{domain, function, route|event, error, stack}`, responde 500 genérico al cliente HTTP si aplica (nunca el stack crudo al cliente).

### core/http-server.js
- `start(port)` → `core.http.iniciado` `{port, pid}`.
- Puerto ocupado → `core.http.puerto_en_uso` (**fatal**) `{port, error}` — fixea server.js:4062, hoy `console.error` suelto e invisible.
- Error genérico de listen → `core.http.error_listen` (**fatal**) `{port, error, stack}` — fixea server.js:4064.

### core/ws-server.js
- Reusa `core/security/is-local-request.js` (equivalente a `isLocalHostname`, server.js:44) e `is-private-ip.js` (equivalente a `isPrivateIP`, server.js:74) para filtrar conexiones.
- `core.ws.cliente_conectado`/`cliente_desconectado` con `{clientId, ip, esDesktop, totalClientes}`.
- `core.ws.mensaje_invalido` (debug) con `{clientId, rawPreview: primeros 200 chars}` — fixea server.js:1737 (hoy `catch(_){}` totalmente silencioso ante un cliente que manda basura por WS).
- `core.ws.origen_rechazado` (warn) con `{ip, hostHeader, origin}` — fixea server.js:239 (hoy responde 403 sin loguear qué origen se rechazó).

### core/broadcast.js
Único punto que traduce `bus.emit('overlay:actualizar'|...)` a `wss.clients.forEach(...)`. Ningún dominio importa `ws-server.js` directo ni llama `.send()` — todos pasan por `bus.emit` y este archivo hace la traducción. Reemplaza el `broadcast(data)` genérico de server.js:1457 pero ya no vive expuesto a los dominios como función libre, vive detrás del bus.

### core/paths.js
Equivalente a `RESOURCE_BASE`/`DATA_BASE` actuales (server.js:20-21): `process.env.TIKTOK_RESOURCES_PATH || __dirname` y `process.env.TIKTOK_USER_DATA_PATH || RESOURCE_BASE`. Se usa en Fase 12 cuando `/electron-shell` reintroduce el modo packaged.

### core/shutdown.js
Recorre los dominios registrados (en orden inverso de registro) y llama `domain.shutdown()` si existe, cada uno en su propio try/catch (uno que falle no bloquea el shutdown de los demás).

### core/contracts/
Solo las interfaces (JSDoc + función que lanza `not implemented` si se llama antes de tiempo) — se implementan de verdad en Fase 3 (`idioma-filtrar`) y Fase 5 (`moderacion-policy`). Sirven para que `/chat` (Fase 7) pueda importarlas desde ya sin acoplarse al dominio concreto.

## Cambios en el placeholder de la raíz
`server.js` (raíz) deja de tener lógica propia de Express/WS: pasa a ser solo:
```js
const { createApp } = require('./core/app');
const { startHttpServer } = require('./core/http-server');
const { createWsServer } = require('./core/ws-server');
const { registerDomain } = require('./core/register-domain');
// ... (dominios se agregan aquí a partir de la Fase 2 en adelante)
```

## Criterios de aceptación
1. Servidor arranca solo con `/core` montado (cero dominios todavía), `GET /api/status` sigue respondiendo `{ok:true}` (implementado directo en `core/app.js` como ruta de salud del kernel, no de un dominio).
2. Test manual: registrar un "dominio" de prueba cuyo `register()` lanza una excepción a propósito → el log muestra `core.dominio.fallo_montaje`, el servidor sigue respondiendo `/api/status`, no hay crash del proceso.
3. Test manual: un listener de bus que lanza excepción no impide que otros listeners del mismo evento se ejecuten (`core.bus.listener_fallido` visible en log).
4. Forzar un fallo de escritura del stream de log (ej. apuntar a un path sin permisos) → `core.logger.escritura_fallida` se emite y el proceso sigue vivo, logueando al menos al buffer en memoria.
5. `grep -rn "console\." core/` da como único resultado el fallback de última instancia dentro de `core/logger.js`.

## Riesgos
- El auto-extract de `stack` en `core/logger.js` tiene que cubrir tanto `data instanceof Error` como `data.error instanceof Error` — revisar contra los ~90 call-sites reales del backend viejo (ver `logging-errores-propuesta.md`) para no dejar ningún patrón sin cubrir cuando se migren.
- `core/ws-server.js` reemplaza la lógica de `isAllowedWsClient` (server.js:109) — confirmar que el criterio de "cliente permitido" es idéntico (localhost + red privada) para no romper el panel móvil en la Fase 8.
