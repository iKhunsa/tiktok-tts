# Handoff de sesión — PortalView (navegador embebido), Fases 1-6 completas, Fase 7 (pulido visual) pendiente

**Fecha de la sesión:** 2026-09-16
**Repo:** `C:\Users\liber\OneDrive\Documentos\tiktok-tts` (GitHub: `iKhunsa/tiktok-tts`)
**Branch de trabajo:** `Dev-2-nuevo-backend`
**Estado al cierre:** Fases 1-6 implementadas, probadas en vivo y a punto de commitear. Fase 7 (pulido visual final) NO empezada — quedó en la etapa de auditoría, antes de tocar código.

Este documento es para que otra IA (o la misma, en otra sesión) retome **solo la Fase 7**. Las fases 1-6 están terminadas y verificadas — no hace falta releer todo el chat, pero si hace falta entender una decisión de arquitectura de esas fases, está documentada acá en la sección 1.

---

## 0. Qué es PortalView

Navegador embebido en split-view dentro de TikLiveTTS (Electron `WebContentsView`, split-view real dentro de la misma ventana — nunca ventana flotante, nunca `<iframe>`). El plan de arquitectura original completo está en `C:\Users\liber\.claude\plans\genera-un-plan-donde-piped-boot.md` (7 fases, todas las decisiones de diseño/seguridad ya justificadas ahí — **leerlo si hace falta contexto de por qué algo se hizo como se hizo**).

Sirve de base para dos cosas futuras (fuera de alcance de todas las fases actuales, no tocar):
1. Login-por-cuenta (TikTok/Twitch/Kick) vía cookies persistentes de la partición de Electron.
2. Automatización de respuestas de chat inyectadas en background.

---

## 1. Fases 1-6 — resumen de qué existe y funciona

### Backend (`electron-shell/portal-view/`)

| Archivo | Qué hace |
|---|---|
| `constants.js` | `MAX_TABS=6`, `PARTITION_NAME`, anchos mín/máx del panel, alturas de tab-bar/toolbar, `PREDEFINED_SHORTCUTS` (TikTok Studio/Twitch Dashboard/Kick). |
| `session.js` | `getPortalViewSession()` — partición persistente memoizada + **permission handler** (deniega mic/cámara/ubicación/notificaciones/MIDI/pointerLock por defecto, permite solo `fullscreen`). |
| `bounds.js` | `clampPanelWidth`, `computeBounds`, `attachResizeListener` — todas puras, el backend es la única autoridad del ancho real del panel. |
| `tab-pool.js` | CRUD de pestañas con hidratación perezosa (`hydrate()` crea el `WebContentsView` real recién cuando hace falta — nunca por cada pestaña "nueva pestaña" vacía). Escucha `did-start/stop-loading`, `page-title-updated`, `did-fail-load`, `render-process-gone` (crash), `unresponsive`/`responsive`. |
| `popups.js` | `setWindowOpenHandler` — http(s) pide pestaña interna nueva, cualquier otro esquema va al navegador externo del sistema. `will-navigate` como defensa en profundidad. |
| `downloads.js` | `will-download` → siempre a `app.getPath('downloads')`, con resolución de colisión de nombre (`archivo (1).png`). |
| `store.js` | Persistencia de `portal-view.json` en `DATA_BASE` (favoritos, pestañas abiertas, ancho del panel, pestaña activa) — debounce 2s + techo duro 10s, escritura atómica. |
| `controller.js` | Orquestador central. Estados **CLOSED / BACKGROUND / VISIBLE**. API completa: `show, hide, closeSession, navigate, newTab, closeTab, switchTab, goBack, goForward, reload, addFavorite, removeFavorite, resizePanel, setPanelWidth, getState, destroyAll`. |
| `ipc.js` | Todos los canales `portal:*` vía `ipcMain.handle`, con `dispose()` (ahora sí se llama desde `main.js` en `will-quit` — ver bug corregido abajo). |

### Contrato MCP (fase 6)

- `core/contracts/portal-view.js` — expone **solo** `{ open, tabCount, activeTabId }`, nunca URLs ni historial.
- `features/portal-view/index.js` — dominio placeholder (0 rutas HTTP), registrado en `server.js` entre `donar` y `telemetria`.

### Frontend (`interfaz/src/vistas/principal/portal-view/`)

| Archivo | Qué hace |
|---|---|
| `estado.js` | Store (`crearAlmacen`) espejo del estado del backend. |
| `panel.js` | Monta el panel (`aside.portal-view-panel`), maneja el drag del divisor (`componentes/divisor-arrastrable.js`), sincroniza ancho con el backend. |
| `tab-bar.js` | Chips de pestaña + botón "+". |
| `toolbar.js` | ←/→/↻/URL/cerrar-sesión/cerrar-panel. |
| `nueva-pestana.js` | Grilla de accesos predefinidos + favoritos + formulario de alta. **El formulario se creó UNA sola vez y nunca se destruye** (bug real que se encontró y arregló en fase 5 — si se reconstruye en cada `actualizarNuevaPestana()`, un evento de fondo borra lo que el usuario está escribiendo). |
| `index.js` | `togglePortalView()`, `iniciarPortalView()`, listener de `portal:download-event` → toast. |

CSS: `interfaz/src/estilos/portal-view.css` (único archivo, ~305 líneas al cierre de esta sesión — **este es el archivo que la Fase 7 va a reescribir/recortar más**).

### Bugs reales encontrados y corregidos en fases 1-6 (no volver a intentar las mismas causas)

1. **Compresión de layout** (fase 2): `margin:auto` de `.app-layout` reclamaba espacio libre antes que `flex-grow` — fix con override condicional `#app-shell.portal-view-open > .app-layout { max-width:none; margin:0; }`.
2. **Ancho no re-clampeado al restaurar ventana / clamp tardío durante drag** (fase 2): el backend pasó a ser la única autoridad del ancho — `resizePanel`/`setPanelWidth` devuelven el valor ya clampeado, el frontend nunca aplica el valor crudo del mouse.
3. **Scroll de TikLiveTTS arrastrando la toolbar de PortalView** (fase 2): causa real = `#app-shell`/`.app-layout`/`body` con `min-height:100vh` en vez de altura fija — el documento entero scrolleaba. Fix: `#app-shell.portal-view-open { height:100vh; overflow:hidden }` + `.main-area` como única que scrollea.
4. **`panelWidthPct` se perdía al cerrar la app** (fase 4): `getState()` recalculaba el % contra `mainWindow.getContentBounds()`, que ya está destruida en `will-quit`. Fix: `panelWidthPct` es ahora una variable de estado propia (`setPanelWidthPx()`), actualizada en cada punto donde el ancho real es conocido — nunca recalculada tarde.
5. **`switchTab()` no hidrataba una pestaña restaurada** (fase 4): se quedaba en blanco para siempre. Fix: hidrata bajo demanda si la pestaña tiene URL pero no vista todavía.
6. **`attachPortalViewIpc()` nunca guardaba su `dispose()`** (fase 6): los 13 handlers de IPC nunca se liberaban en `will-quit`. Corregido en `main.js`.
7. **Bug del título de ventana (KNOWN ISSUE de fases 1-2) — ya NO se reproduce.** Se probó en vivo navegando a tiktok.com/Twitch/Google con el panel abierto y el título de la `BrowserWindow` se mantuvo estable. Se documentó como resuelto (probablemente incidental, por los cambios de bounds/multi-tab de fases posteriores) en el comentario de `controller.js`. **Si reaparece, revisar primero si algo nuevo llama `mainWindow.setTitle()` antes de sospechar de Electron.**

### Limitación conocida, documentada, NO arreglada (fuera de alcance)

**Popups/OAuth basado en `window.opener.postMessage()`** (patrón de Google/Firebase Auth, Facebook Login) no funciona — `popups.js` deniega todo popup y abre una pestaña interna sin relación `window.opener`. OAuth por **redirect de página completa** (Twitch, la mayoría de plataformas de streaming) funciona normal — confirmado en vivo con el login de Twitch. Arreglar el caso popup requiere un subsistema nuevo (bridging `window.opener`/`postMessage` entre `WebContentsView`s) — deliberadamente fuera de alcance hasta el rediseño real de login-por-cuenta.

### Verificación hecha en fases 1-6

Todo probado en vivo con Windows-MCP contra la app real corriendo (`npm run electron`), no solo lectura de código: apertura/cierre del panel, drag del divisor hasta los límites, multi-pestaña (límite de 6, popups a pestaña interna), persistencia completa (cerrar la app entera y reabrir), ventana dinámica (agranda/permite achicar según el panel), favoritos (agregar/quitar/predefinidos), `closeSession()` (destruye pestañas, preserva cookies y favoritos, procesos Chromium bajan de vuelta a la línea base), cero procesos `electron.exe` huérfanos tras cerrar. `npm run build:front` limpio, paridad de claves i18n en los 10 idiomas confirmada por script.

---

## 2. Fase 7 — la tarea a retomar, tal cual la pidió el usuario

> Empieza la Fase 7 de PortalView: pulido visual y UX final.
>
> Objetivo principal:
> Quiero que PortalView se vea y se sienta como el browser integrado de Claude Code: minimalista, limpio, compacto y profesional.
>
> No quiero una interfaz tipo Chrome tradicional.
> No quiero barras gruesas, sombras fuertes, botones grandes ni demasiados elementos visibles.
> La prioridad es que el contenido web ocupe casi todo el espacio.
>
> Enfócate en:
> - tab-bar muy compacta;
> - toolbar mínima;
> - iconos pequeños y discretos;
> - bordes sutiles;
> - poco ruido visual;
> - estados hover/active muy suaves;
> - URL bar limpia y simple;
> - tabs con jerarquía clara pero sin parecer Chrome;
> - animaciones cortas y discretas;
> - tooltips solo donde hagan falta;
> - focus visible sin ser invasivo;
> - reduced-motion;
> - espaciados consistentes;
> - nueva pestaña limpia, sin exceso de cards o decoración;
> - errores/loading/crash mostrados de forma sobria.
>
> Referencia conceptual:
> Claude Code Browser > Chrome.
>
> Quiero que PortalView parezca una extensión natural de TikLiveTTS, no un navegador externo metido dentro de la app.
>
> Mantén los colores y branding actuales de TikLiveTTS, pero usa la lógica visual de Claude:
> - superficies planas;
> - líneas finas;
> - controles secundarios;
> - contenido como protagonista;
> - máximo aprovechamiento vertical.
>
> No rediseñes toda la aplicación.
> No agregues features nuevas.
> No metas efectos visuales innecesarios.
>
> Antes de modificar código, revisa la UI actual y dime qué elementos están demasiado grandes, cargados o poco minimalistas.
>
> Luego implementa y verifica:
> - drag;
> - scroll independiente;
> - tabs;
> - persistencia;
> - CLOSED/BACKGROUND/VISIBLE;
> - reduced-motion;
> - distintos tamaños de ventana.
>
> Al final resume qué cambiaste para acercarlo visualmente al browser de Claude Code.

El usuario adjuntó como referencia visual concreta un screenshot del **panel de navegador integrado de Claude Code** (la herramienta con la que se está trabajando). Sus características observables en ese screenshot:

- Tab-bar: tabs chicos tipo chip (no "pestaña de Chrome" con esquinas superiores redondeadas conectadas al contenido), texto pequeño, "×" de cierre discreto, "+" al final, todo muy compacto, sin bordes gruesos entre tabs.
- Toolbar: fila fina con ←/→/↻ a la izquierda (atenuados cuando no aplican), un campo de URL centrado tipo pill con borde sutil de 1px, un par de iconos chicos a la derecha. Todo en una sola línea delgada.
- Contenido: ocupa prácticamente toda la ventana, sin marcos ni padding visible alrededor.
- Pantalla de "nueva pestaña"/sin servidor: **no es una grilla de cards con borde** — es una lista simple de filas (icono + nombre + tag chico + botón "play" circular chico), centrada, con mucho espacio en blanco alrededor. Texto de ayuda muted debajo.

---

## 3. Auditoría ya empezada (quedó a medio hacer — retomar desde acá)

Antes de la interrupción, ya se había invocado la skill `emil-design-eng` (**es obligatorio invocarla antes de tocar CSS/markup nuevo** — está en `CLAUDE.md` del repo como regla dura del proyecto) y se había leído completo `interfaz/src/estilos/portal-view.css` + las variables de diseño disponibles en `interfaz/src/estilos/index-legacy.css`. Estos son los hallazgos concretos ya identificados, listos para convertirse en cambios:

| Elemento actual | Problema respecto al objetivo | Dirección del cambio |
|---|---|---|
| `.portal-view-tab { border-radius: var(--radius-xs) var(--radius-xs) 0 0 }` | Esquinas superiores redondeadas + esquinas inferiores rectas = forma clásica de "pestaña de Chrome pegada al contenido". El usuario pidió explícitamente "sin parecer Chrome". | Radio completo en las 4 esquinas (chip/píldora chica), separado visualmente del contenido, no "conectado" a él. |
| `.portal-view-tab-bar { background: var(--surface-0) }` + `.portal-view-toolbar { background: var(--surface-1) }` | Dos superficies distintas apiladas, cada una con su propio `border-bottom` → dos líneas divisorias visibles, un poco de ruido. | Unificar el fondo de tab-bar y toolbar (mismo `--surface-*`), y dejar una sola línea sutil entre toolbar y contenido (no entre tab-bar y toolbar). |
| `.portal-view-toolbar .icon-btn` → 28×28px, icono 16×16px | Un poco grande para "iconos pequeños y discretos". | Reducir a ~24×24px con icono ~14×14px, consistente con el screenshot de referencia. |
| `.portal-view-shortcut` (grilla de "nueva pestaña") | Cards de 64px con `border: 1px solid`, grilla `auto-fill minmax(120px,1fr)` — exactamente lo que el usuario pidió evitar ("sin exceso de cards o decoración"). Es el elemento que más se aleja de la referencia. | Reemplazar la grilla de cards bordeadas por una **lista vertical de filas** (icono chico + label + hover sutil, sin borde visible en reposo), como en el screenshot de Claude Code. |
| `.portal-view-fav-form` | Dos `<input>` con borde + botón, siempre visibles, con un `border-top` separador — bastante peso visual para una acción secundaria. | Evaluar si conviene colapsarlo detrás de un trigger chico ("+ agregar") que revele los campos al usarlo — más fiel a "controles secundarios" y "sin exceso de decoración". Si se colapsa: es pulido visual (toggle de visibilidad), no una feature nueva — no viola "no agregues features nuevas". |
| `.portal-view-panel` — animación de entrada `translateX(24px)` + opacity, `var(--dur-3)` = 240ms | Duración ya está dentro de rango (<300ms), pero el desplazamiento de 24px es bastante para algo tan grande como un panel completo — se nota más "movimiento de chrome pesado" que "aparición discreta". | Reducir el desplazamiento a ~8-12px, mantener la duración o acortarla un poco. Ya respeta `prefers-reduced-motion` y `body.reduce-motion` — no tocar esa parte, ya está bien. |
| Focus states | No auditado todavía — revisar que los elementos interactivos (tabs, botones de toolbar, inputs) tengan un anillo de foco visible pero fino (no el `outline` grueso por default del navegador ni nada invasivo). | Pendiente de revisar con teclado real (Tab) en la app corriendo. |
| Tooltips | Ya existen vía `data-i18n-title`/`title` nativo del navegador en todos los botones de icono — el usuario pidió "tooltips solo donde hagan falta", lo cual ya se cumple (no hay tooltips en elementos autoexplicativos como el propio contenido). Probablemente no haga falta tocar nada acá, solo confirmar que no sobran. | Revisar rápido, bajo riesgo de necesitar cambios. |

### Variables de diseño disponibles (usar estas, no inventar valores nuevos)

De `interfaz/src/estilos/index-legacy.css`, `:root`:

```css
/* Radios */
--radius-xs: 6px;  --radius-sm: 8px;  --radius-md: 12px;  --radius-lg: 16px;  --radius-pill: 9999px;

/* Espaciado (base 4) */
--space-1: 4px;  --space-1-5: 6px;  --space-2: 8px;  --space-2-5: 10px;  --space-3: 12px;  --space-4: 16px;

/* Tipografía */
--text-3xs: 10px;  --text-2xs: 11px;  --text-xs: 12px;  --text-sm: 13px;  --text-base: 14px;  --text-md: 16px;

/* Movimiento */
--ease-out: cubic-bezier(.22, .61, .36, 1);
--ease-in-out: cubic-bezier(.65, 0, .35, 1);
--dur-1: 150ms;  --dur-2: 200ms;  --dur-3: 240ms;  --dur-4: 320ms;

/* Superficies (branding actual, NO cambiar la paleta) */
--surface-0: #131315;  --surface-1: #1a1a1a;  --surface-2: #1e1e1e;  --surface-3: #242424;
--border-subtle: #242424;  --border: #2e2e2e;  --border-strong: #363636;
--text: #fafafa;  --text-secondary: #b4b4b4;  --text-muted: #898989;
--hover-1: rgba(255,255,255,0.04);  --hover-2: rgba(255,255,255,0.06);  --hover-3: rgba(255,255,255,0.10);
--brand: #F0213A;  /* rojo de marca, fijo, no cambia con el tema de la vista */
```

`.icon-btn`/`.icon-inline` genéricos de la app (usados en el resto de la UI, ver `index-legacy.css` línea ~1875) — PortalView ya define su propia variante dentro de `.portal-view-toolbar .icon-btn`, confirmar si conviene seguir así o generalizar.

---

## 4. Qué hacer en esta sesión (orden sugerido)

1. **Invocar la skill `emil-design-eng`** antes de escribir CSS/markup (regla dura del `CLAUDE.md` del repo para cualquier trabajo visual).
2. Completar la auditoría de la tabla de la sección 3 (ya está bastante avanzada) — confirmar con el usuario si hace falta, o directamente proceder si el pedido ya es lo bastante específico (el usuario ya dijo "antes de modificar código, revisa... y dime qué elementos están..." — probablemente conviene mostrarle el diagnóstico completo en una tabla Before/After antes de tocar código, tal como pide el formato de la skill).
3. Implementar los cambios en:
   - `interfaz/src/estilos/portal-view.css` (el grueso del trabajo).
   - `interfaz/src/vistas/principal/portal-view/nueva-pestana.js` (si se decide reemplazar la grilla de cards por lista de filas — cambia el markup, no solo CSS).
   - `interfaz/src/vistas/principal/portal-view/tab-bar.js` / `toolbar.js` (si algún cambio de jerarquía visual requiere tocar el DOM, no solo estilos).
4. `npm run build:front` antes de cada prueba (`npm run electron` no rebuildea el frontend solo — regla del `CLAUDE.md` del repo, ya usada en todas las fases anteriores).
5. Verificar en vivo (con Windows-MCP contra la app real, mismo patrón que fases 1-6):
   - Drag del divisor (hasta los límites, en ventana chica y grande).
   - Scroll independiente (TikLiveTTS scrollea, PortalView no se mueve).
   - Multi-tab (crear, cambiar, cerrar, límite de 6).
   - Persistencia (cerrar la app entera, reabrir, confirmar que todo vuelve igual).
   - Los 3 estados CLOSED/BACKGROUND/VISIBLE (abrir, ocultar con "Cerrar", `closeSession()` completo).
   - `prefers-reduced-motion` / `body.reduce-motion` (confirmar que las animaciones nuevas también lo respetan si se agrega alguna).
   - Ventana en distintos tamaños (mínimo 900px sin panel, 1060px con panel, maximizada).
6. Cerrar la app y confirmar **cero procesos `electron.exe` huérfanos** (mismo chequeo de todas las fases anteriores).
7. Al final, resumir qué se cambió específicamente para acercar PortalView al browser de Claude Code — el usuario lo pidió explícitamente como cierre.

## 5. Qué NO hacer

- No rediseñar nada fuera de `portal-view.css` y los componentes de `interfaz/src/vistas/principal/portal-view/` — el pedido es acotado a PortalView, no a la app entera.
- No agregar funcionalidad nueva (favoritos, atajos, permisos, etc. ya están completos desde fases 5-6) — Fase 7 es solo visual.
- No tocar la paleta de colores de marca (`--brand`, `--surface-*`, etc.) — mantener el branding actual de TikLiveTTS, solo cambiar la "lógica visual" (densidad, jerarquía, formas) hacia el estilo Claude Code.
- No reabrir ninguno de los 7 bugs ya resueltos de la sección 1 — si algo se rompe durante el pulido visual, la causa real está probablemente en el CSS de containment/scroll (`#app-shell.portal-view-open`, `.main-area`) que ya se resolvió con mucho esfuerzo en la fase 2 — no tocar esas reglas salvo que el bug se reproduzca de verdad, con evidencia.

## 6. Archivos clave para orientarse rápido

| Qué | Dónde |
|---|---|
| Plan de arquitectura original (7 fases, todas las decisiones justificadas) | `C:\Users\liber\.claude\plans\genera-un-plan-donde-piped-boot.md` |
| CSS a reescribir (foco principal de la Fase 7) | `interfaz/src/estilos/portal-view.css` |
| Nueva pestaña (candidato a rehacer el markup, no solo CSS) | `interfaz/src/vistas/principal/portal-view/nueva-pestana.js` |
| Toolbar / tab-bar | `interfaz/src/vistas/principal/portal-view/toolbar.js`, `tab-bar.js` |
| Controller backend (no debería hacer falta tocarlo en fase 7) | `electron-shell/portal-view/controller.js` |
| Skill obligatoria antes de CSS/markup nuevo | `emil-design-eng` (invocar con el Skill tool) |
| Este handoff | `Docu 2/handoff-portalview-fase7-2026-09-16.md` |

## 7. Próximo paso sugerido

Mostrarle al usuario la tabla Before/After completa de la sección 3 (formato obligatorio de la skill `emil-design-eng`) antes de tocar ningún archivo, tal como pidió explícitamente ("antes de modificar código, revisa la UI actual y dime qué elementos están demasiado grandes, cargados o poco minimalistas"). Recién después de esa confirmación, implementar.
