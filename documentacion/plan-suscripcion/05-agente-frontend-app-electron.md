# Agente 05 — Frontend de la aplicación (Electron / UI)

## Objetivo

Implementar toda la parte visual de cuentas dentro de `interfaz/`: registro,
login, perfil (ver/editar datos, estado del plan, botón de upgrade y de
cancelación), el badge de plan en el sidebar, y el "candado" visual + CTA de
upgrade en las features Pro. **Respetando estrictamente el sistema de diseño
actual** — sin introducir un estilo, componente base o sistema visual distinto
al que ya tiene la app. Consume el estado de sesión del agente 04 y el punto de
entrada al checkout del agente 03.

## Dependencias explícitas

- **Gate D**: `04-contrato-sesion.md` escrito y el dominio `features/auth/`
  respondiendo `bus.on('auth:get')` con la forma documentada (aunque sea mock).
- `03-contrato-checkout.md`: endpoint de checkout y querystring de retorno.
- Lectura previa obligatoria (patrones a replicar — **no inventar**):
  - `interfaz/src/vistas/principal/mcp/index.js` — **plantilla de vista nueva**:
    `fetch('/api/…')`, `innerHTML` con clases del sistema, `aplicarTraducciones(el)`
    tras inyectar, export `render…()` + `init…()`.
  - `interfaz/index.html` — cómo se declara un `<button class="sidebar-item">` y un
    `<div class="view" id="view-…">` (ver `mcp`, líneas ~1214).
  - `interfaz/src/vistas/principal/vistas-router.js` — `switchView` + hook de
    render perezoso.
  - `interfaz/src/vistas/principal/index.js` — `Object.assign(window, {…})` y
    `iniciarArranque()`.
  - `interfaz/src/estilos/index-legacy.css` líneas 1–132 (`:root` tokens) y las
    clases `.settings-section`, `.settings-section-title`, `.settings-panel`,
    `.setting-group`, `.cfg-btn` (+ `.danger`/`.warn`/`.small`), `.toggle-chip`,
    `.modal-overlay`/`.modal-content`, `.badge-new`, `.icon-inline`,
    `.view-header`.
  - `interfaz/src/nucleo/estado/config-runtime.js` — patrón de estado
    server-autoritativo + re-hidratación por WS (a espejar en `sesion.js`).
  - `interfaz/src/nucleo/estado/crear-almacen.js` — `crearAlmacen({...})`.
  - `interfaz/src/nucleo/ws/cliente-ws.js` — el `switch (data.type)`, dónde se
    agrega `case 'auth-updated'`.
  - `interfaz/src/nucleo/i18n/i18n.js` — `t()`, `tErr()`, `aplicarTraducciones()`,
    `data-i18n*`.
  - `interfaz/src/componentes/toast.js` — `showToast(msg, type)`.
  - `interfaz/publico/locales/es.json` — estructura; `interfaz/publico/plugin-store/registry.js`
    — `SIDEBAR_TOOLS`.
  - `interfaz/src/vistas/principal/i18n-app.js` — `retranslateDynamic()` (registrar
    la re-render de la vista de cuenta acá si dibuja texto en JS).
  - `CLAUDE.md` secciones "i18n de la UI" e "Íconos — nunca emojis".

## Contrato de entrada

| Artefacto | De quién | Uso |
|---|---|---|
| `04-contrato-sesion.md` | agente 04 | Forma del objeto de sesión, evento `auth-updated`, endpoints `/api/auth/*` de la app que puede llamar el front, cómo consultar "¿feature desbloqueada?". |
| `03-contrato-checkout.md` | agente 03 | `POST /api/auth/checkout` (proxy del 04) → `{ url }`; querystring de retorno de Polar. |
| `04-features-pro.md` | agente 04 | Qué `featureId` está gateado y en qué vista/sección vive (para poner el candado en la UI correspondiente). |
| Sistema de diseño actual | repo | Tokens y clases listadas arriba. **Fuente única de estilo.** |

## Contrato de salida

1. **`interfaz/src/nucleo/estado/sesion.js`** — `crearAlmacen({ signedIn:false,
   user:null, plan:'free', entitlements:[], expiresAt:null })`. `cargarSesion()`
   (`GET /api/auth/session`), `aplicarSesion(data)` (setState + repintado de DOM
   dependiente: badge del sidebar, candados). Se re-hidrata desde
   `cliente-ws.js` en `case 'auth-updated'`. Helper `estaDesbloqueada(featureId)`.
2. **Vista "Cuenta"** — módulo `interfaz/src/vistas/principal/cuenta/index.js`
   (carpeta, patrón `mcp/`), con sub-estados en la misma vista:
   - **Deslogueado**: formulario de registro / login (tabs), respetando
     `.setting-group` para los inputs y `.cfg-btn` para el submit.
   - **Logueado**: perfil — email, nombre (editable), estado del plan (`free` /
     `pro` + fecha de expiración si aplica), botón "Hazte Pro" (si `free`) o
     "Gestionar suscripción / Cancelar" (si `pro`), botón "Cerrar sesión".
3. **Botón de sidebar** "Cuenta" en `interfaz/index.html` + `<div class="view"
   id="view-cuenta">` + registro en `vistas-router.js` (render perezoso) y
   `vistas/principal/index.js` (handlers en `window`, `iniciarCuenta()` en
   `iniciarArranque()`).
4. **Badge de plan en el sidebar** — un `.badge-new`-style (o reutilizar
   `.badge-new`) que muestra "PRO" cuando `sesion.plan === 'pro'`. Sin plan / free:
   sin badge.
5. **Candado en features Pro** — en cada vista/sección de `04-features-pro.md`,
   cuando `subscriptionsEnabled` y `!estaDesbloqueada(id)`: overlay o estado
   deshabilitado con `<img class="icon-inline" src="icons/lock.svg">` + texto
   `t('cuenta.proRequerido')` + botón que hace `switchView('cuenta')` y scrollea
   al upgrade. **Sin bloquear el resto de la app.**
6. **Flujo de checkout** — el botón "Hazte Pro" hace `POST /api/auth/checkout` →
   recibe `{ url }` → abre la URL. Como `window.js` manda las URLs externas al
   navegador del sistema, un `window.open(url)` o `<a href target=_blank>` termina
   en el browser externo (comportamiento deseado). Al volver a la app, `refresh.js`
   del agente 04 ya actualiza el estado; la UI muestra un aviso "Estamos
   confirmando tu pago…" mientras `plan` siga `free` tras N segundos.
7. **i18n**: sección `cuenta.*` (y `errors.*` nuevas: `unauthorized`,
   `proRequired`, `emailTaken`, `invalidCredentials`, `notImplemented`) agregada a
   los **10** archivos `interfaz/publico/locales/*.json`, `es.json` como fuente.
   Más `nav.cuenta` y, si la vista no es `pinned`, `store.desc.cuenta` /
   `store.about.cuenta` + entrada en `SIDEBAR_TOOLS`.
8. **Iconos**: copiar de `asset/icons/` a `interfaz/publico/icons/` los que falten
   (`person.svg`/`account_circle.svg`, `lock.svg`, `workspace_premium.svg` o
   similar). Nunca emoji.
9. **Registro en `retranslateDynamic()`** (`i18n-app.js`) de la re-render de la
   vista Cuenta.

## Tareas

- [ ] **1.** Leer `04-contrato-sesion.md`, `03-contrato-checkout.md`,
  `04-features-pro.md` y **todos** los archivos-patrón de "Dependencias
  explícitas". No escribir nada hasta tener claro el patrón de `mcp/index.js`.
- [ ] **2.** Crear `nucleo/estado/sesion.js` con `crearAlmacen`, `cargarSesion()`,
  `aplicarSesion()`, `estaDesbloqueada(featureId)`. Espejo de `config-runtime.js`.
- [ ] **3.** En `cliente-ws.js` agregar `case 'auth-updated': aplicarSesion(data.session); break;`.
- [ ] **4.** En `vistas/principal/index.js` `iniciarArranque()`: llamar
  `cargarSesion()` justo después de `loadRuntimeConfig()`.
- [ ] **5.** Copiar los iconos SVG necesarios de `asset/icons/` a
  `interfaz/publico/icons/`. Verificar que renderizan con `class="icon-inline"`.
- [ ] **6.** Agregar a `interfaz/index.html`: `<button class="sidebar-item"
  data-view="cuenta" onclick="switchView('cuenta')">` con su icono + `<span
  data-i18n="nav.cuenta">`, y el `<div class="view" id="view-cuenta">` con
  `view-header` + un contenedor `#cuentaPanel`.
- [ ] **7.** Crear `vistas/principal/cuenta/index.js`:
  - `renderCuentaPanel()` — lee `sesion.getState()`, dibuja el sub-estado
    (deslogueado / logueado) con clases del sistema, llama `aplicarTraducciones(el)`.
  - Formularios: registro (`nombre`, `email`, `password`) y login (`email`,
    `password`) con `.setting-group`; submit con `.cfg-btn`; errores vía
    `showToast(tErr(data, 'errors.generic'))`.
  - Perfil: campos, estado de plan, botones. "Cerrar sesión" → `POST /api/auth/logout`
    → `aplicarSesion({signedIn:false,…})`.
  - `iniciarCuenta()` — hook de boot (no-op o listeners).
- [ ] **8.** Registrar en `vistas-router.js`: `if (name === 'cuenta') renderCuentaPanel();`.
  En `vistas/principal/index.js`: importar handlers, `Object.assign(window, { … })`,
  `iniciarCuenta()` en `iniciarArranque()`.
- [ ] **9.** Badge "PRO" en el sidebar: en `aplicarSesion()`, toggle de una clase /
  elemento en el `.sidebar-item[data-view="cuenta"]` (o en el footer) según
  `plan === 'pro'`.
- [ ] **10.** Implementar el flujo de checkout en el botón "Hazte Pro"
  (`POST /api/auth/checkout` → abrir `{ url }`), y el aviso "confirmando pago" al
  volver (si `plan` sigue `free` tras ~8 s de polling suave a `cargarSesion()`).
- [ ] **11.** Candado en features Pro: para cada entrada de `04-features-pro.md`,
  en su vista, envolver la sección con un check `if (subscriptionsEnabled &&
  !estaDesbloqueada(id))` → estado bloqueado con icono `lock.svg` + CTA. Delegar la
  ubicación exacta en cada vista al **auxiliar de revisión de vistas** (ver
  Delegación).
- [ ] **12.** i18n: agregar la sección `cuenta.*`, las `errors.*` nuevas, `nav.cuenta`
  a `es.json`; propagar a los otros 9. Correr el script de paridad de claves
  (CLAUDE.md: "contar claves hoja de los 10 JSON y confirmar que coinciden").
- [ ] **13.** Si la vista no es `pinned`: agregar entrada a `SIDEBAR_TOOLS`
  (`interfaz/publico/plugin-store/registry.js`) + `store.desc.cuenta` /
  `store.about.cuenta` en los 10 locales. Recomendado: `pinned:true` (cuentas es
  central), lo cual evita las claves de store — **preguntar al usuario** si
  prefiere pinned u oculto por defecto.
- [ ] **14.** Registrar la re-render de la vista Cuenta en `retranslateDynamic()`
  (`i18n-app.js`), envuelta en `safe()`.
- [ ] **15.** Verificar en el navegador (dev server): flujo deslogueado→registro→
  logueado→editar nombre→logout; con `subscriptionsEnabled=false` la vista Cuenta
  no aparece (o aparece vacía/oculta según lo acordado) y ninguna feature muestra
  candado; con `=true` y user free, candado visible; con user pro, sin candado +
  badge PRO. Screenshots de cada estado.
- [ ] **16.** Chequear consola sin errores, dark/light si aplica
  (`resize_window`), y que ningún estilo nuevo se salió de los tokens (grep de
  hex colors en el CSS/JS nuevo → debería usar `var(--…)`).
- [ ] **17.** Actualizar `HANDOFF.md`: agente 05 a "hecho" con los screenshots
  adjuntos.

## Criterios de "hecho"

1. La vista "Cuenta" usa **solo** clases y tokens existentes; grep de valores de
   color literales (`#`, `rgb(`) en los archivos nuevos de `interfaz/` no
   encuentra nada que no sea `var(--…)`.
2. Registro → login → `GET /api/auth/session` deja `sesion.getState().signedIn === true`
   y el perfil muestra email/nombre/plan.
3. Editar el nombre → `PATCH /api/auth/account` → el perfil refleja el nombre nuevo
   sin recargar.
4. "Cerrar sesión" vuelve al formulario de login y `sesion.getState().signedIn === false`.
5. Un error del servicio (`401`, `409 email taken`) se muestra como toast
   traducido vía `tErr()`, no como texto crudo en inglés.
6. `case 'auth-updated'` en `cliente-ws.js`: emular el mensaje WS → la UI (badge,
   candados, perfil) se actualiza sin acción del usuario.
7. Con `subscriptionsEnabled=true` + user `free`: las features de `04-features-pro.md`
   muestran el candado + CTA; hacer clic lleva a la vista Cuenta.
8. Con user `pro`: sin candados, badge "PRO" en el sidebar.
9. Con `subscriptionsEnabled=false`: cero candados, la app se ve/usa igual que hoy.
10. Botón "Hazte Pro" → abre la URL de checkout de Polar en el navegador externo.
11. Paridad de claves i18n: los 10 JSON tienen la misma cantidad de claves hoja
    (script de conteo lo confirma).
12. `npm run build` (Vite) pasa sin warnings nuevos; consola del dev server sin
    errores en ninguno de los estados.
13. Screenshots de los 5 estados adjuntos en `HANDOFF.md`.

## Delegación

| Tarea concreta a delegar | A qué subagente | Info mínima que le paso | Qué espero de vuelta |
|---|---|---|---|
| Ubicar el punto exacto de cada vista donde va el candado Pro (tarea 11) | **auxiliar de revisión de vistas** (Explore, read-only) | La lista de `04-features-pro.md` (featureId + vista). "Por cada uno, decime el archivo `interfaz/src/vistas/principal/<x>.js` y la función/nodo donde envolver la sección con el check de bloqueo, sin romper el layout existente." | Tabla featureId → archivo → función/selector → nota de layout. |
| Confirmar que el CSS nuevo no rompe tokens ni dark mode (tarea 16) | **auxiliar de revisión de diseño** (`design:design-critique` o Explore) | El diff de CSS/JS de `interfaz/`. "¿Algún color/spacing/radio hardcodeado? ¿Contraste OK en `body.high-contrast`? ¿Se rompe algo con `body.reduce-motion`?" | Lista de desvíos del sistema, o "sin desvíos". |
| Traducir la sección `cuenta.*` a los 9 idiomas no-español (tarea 12) | **auxiliar de traducción i18n** (nuevo) | El bloque `cuenta.*` + `errors.*` nuevos de `es.json`. "Traducí a en, it, pt, fr, de, zh, ja, ko, ru manteniendo las mismas claves y los `{placeholders}`. Nombres de marca (PRO, Polar) no se traducen." | Los 9 bloques JSON listos para pegar. |
| Screenshots de los 5 estados en el dev server (tarea 15) | **nadie** — lo hace el agente 05 con el Browser pane | — | — |

Motivo: la ubicación del candado por vista requiere leer ~10 archivos de vista —
el agente 05 solo necesita el mapa resultante. La traducción a 9 idiomas es
volumen puro que no aporta al contexto de implementación.

## Riesgos y rollback

- **Deriva visual** — el riesgo #1 y el que el usuario marcó explícito. Regla
  dura: si algo "necesita" un componente que no existe (stepper, tarjeta de
  precio, modal de confirmación con estilo propio), **el agente 05 para y le
  pregunta al usuario**; no improvisa. Reutilizar `.modal-overlay`/`.modal-content`
  para confirmaciones.
- **Bloqueo excesivo** — el candado nunca debe impedir usar el núcleo gratis ni
  romper el layout de una vista. Es un overlay/disabled state, no un `return`
  temprano que deja la vista en blanco.
- **Password en el DOM/logs** — el input de password nunca se loguea, nunca se
  guarda en `localStorage`. "Recordar email" (solo el email) sí, con clave
  namespaced `tikliveTTS_cuenta_v1`.
- **Estado de plan desincronizado en la UI** — la UI **nunca** decide el plan;
  siempre lo lee de `sesion` que viene de `/api/auth/session`. No cachear "es pro"
  en `localStorage`.
- Rollback: con `subscriptionsEnabled=false` la vista Cuenta y los candados no se
  renderizan. El trabajo vive en rama hasta el OK de QA. Revertir = no mergear.
