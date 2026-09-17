# Bug 08 — Botón "Fallos conocidos" muerto (`showKnownIssuesNotice is not defined`)

## Contexto

GlitchTip issue 50: `Uncaught ReferenceError: showKnownIssuesNotice is not
defined` en `HTMLButtonElement.onclick`. Es el botón **"Fallos conocidos"** del
header de la vista Overlays (al lado de "Ver tutorial").

- Se llama inline: `interfaz/index.html:244` →
  `onclick="showKnownIssuesNotice()"`.
- La función **existe y está bien**: `interfaz/src/vistas/principal/utils-app.js:11-14`,
  `export function showKnownIssuesNotice() { showToast(t('overlayStr.knownBugsMsg')); }`.
- Pero **nunca se bridgeó a `window`**. Los `onclick` inline resuelven contra
  `window`; los demás handlers inline se exponen explícitamente en
  `interfaz/src/vistas/principal/index.js` (~L100-158) vía `Object.assign(window,
  { … })`. `showKnownIssuesNotice` no está ni en el `import` ni en ese objeto.
- Roto desde el refactor ESM (commit `a19a3fd`). Antes todo el JS de index.html
  era global y el handler inline funcionaba.

## Problema

Al hacer clic en "Fallos conocidos" no pasa nada y se registra un error en
GlitchTip / la consola.

## Pasos para reproducir

1. Abrir la app, ir a la vista Overlays.
2. Clic en el botón "Fallos conocidos" (header, arriba a la derecha).
3. No aparece el toast. GlitchTip registra `error_interfaz: showKnownIssuesNotice is not defined`.

## Comportamiento esperado

El clic muestra el toast `t('overlayStr.knownBugsMsg')` ("Algunas secciones
tienen errores conocidos. Se arreglarán próximamente.").

## Alcance / archivos involucrados

- `interfaz/src/vistas/principal/index.js` — agregar `showKnownIssuesNotice` al `import` desde `./utils-app.js` (~L34, junto a `copyToClipboard`) y a la lista del `Object.assign(window, { … })` (grupo `// utils`, ~L107-108).

## Criterios de aceptación

- [ ] Clic en "Fallos conocidos" muestra el toast, sin error en consola ni GlitchTip.
- [ ] `npm run build:front` OK.
- [ ] No se agregó nada más que el import + la línea en el bridge (es un fix de 1 línea efectiva, 2 con el import).

## Notas / restricciones

- Fix mínimo. NO refactorizar el mecanismo de bridge de handlers inline.
- NO convertir el `onclick` inline a `addEventListener` (sería más "correcto" pero es scope creep; todos los demás botones del header siguen el patrón inline+bridge).
- Verificar de paso si hay OTROS handlers inline en `index.html` / `advanced.html` sin bridge (grep rápido de `onclick="` vs. el `Object.assign(window,…)`). Si aparece alguno más, anotarlo en el log de HANDOFF pero NO arreglarlo en esta tarea (un archivo = un bug) — crear/pedir un bug nuevo.
- Independiente de todo el resto del roadmap.
