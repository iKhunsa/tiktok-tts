# Frontend — Modularidad, i18n e iconografía

## Frontend modular (`interfaz/`)

Rebuild completo del frontend (mismo patrón que el rebuild por dominios del backend, ver `ARQUITECTURA.md`): HTML monolítico → módulos ESM en `interfaz/`, siguiendo **la misma regla de modularidad del backend** (ver `MODULARIDAD.md` — incluye el "antes reusar"). 

El `public/` legado ya no existe en el repo (fase-06) — `interfaz/dist/` (build de Vite) es la única raíz estática que sirve `core/app.js`.

### Estructura

```
interfaz/
  index.html  advanced.html  mobile.html  overlay-*.html   ← entries de Vite
  src/
    nucleo/          ← framework-agnostic: ws/, estado/, i18n/, tts/, log-storage.js
    componentes/      ← toast, campos de formulario reutilizables
    vistas/
      principal/       ← index.html (~30 módulos, orquestador en index.js)
      avanzada/         ← advanced.html
      movil/            ← mobile.html (panel remoto)
  compartido/        ← consumido además por los 7 overlays vanilla de OBS
  publico/           ← Vite publicDir: icons/, flags/, locales/, vendor/,
                         plugin-store/, img/, asset/, logos, favicon
  dist/              ← generado (gitignored), output de `vite build`
```

### Convenciones

- **Carpetas de dominio/vista:** kebab-case **español** (espejo de las carpetas de dominio del backend)
- **Nombres de archivo:** kebab-case **inglés** describiendo la función que exportan (`cliente-ws.js` → `conectarWS`), igual que en el backend
- **Módulos:** CommonJS en el backend, ESM (`import`/`export`) en el frontend — única diferencia de convención
- **Excepción:** `interfaz/publico/plugin-store/` y `interfaz/publico/vendor/` son scripts clásicos (`<script src>`, sin módulos) que Vite copia a `dist/` sin tocar — `eslint.config.js` los lintea con `sourceType: 'script'` aparte del resto de `interfaz/`.

### Núcleo

`interfaz/src/nucleo/` (estado, WS, i18n, cola TTS) es framework-agnostic y no depende de ninguna vista; las vistas no se importan entre sí, solo consumen `nucleo/` y `componentes/`.

**Bundler:** Vite multi-entry (`interfaz/vite.config.js`), `publicDir: interfaz/publico`.

**Sin framework de UI (no React):** el estado vive en un mini-store propio (`crearAlmacen`, sin dependencias externas) y las vistas dinámicas usan helpers de render dirigido en `interfaz/src/render/`.

### Recursos

`gifts/`, `sounds/`, `asset/` (fuente de iconos) y `lang-words/` (diccionarios del filtro de idioma) siguen en la raíz del repo, fuera de `interfaz/` — son recursos que lee el **backend** por filesystem (`RESOURCE_BASE`), no estáticos servidos al cliente; no confundir con `interfaz/publico/`.

## i18n de la UI — obligatorio para todo texto nuevo

La app tiene un sistema de traducción funcionando en 10 idiomas (`es, en, it, pt, fr, de, zh, ja, ko, ru`). **Cualquier código nuevo (o modificado) que agregue texto visible al usuario final tiene que pasar por este sistema — nunca hardcodear un string en español (ni en ningún idioma) directo en HTML/JS/backend.**

### Frontend

**Función única:** `t(key, vars)` en `interfaz/src/nucleo/i18n/i18n.js` (`index.html`/`advanced.html`/`mobile.html`) y su espejo `interfaz/compartido/i18n-overlay.js` para los 7 overlays vanilla de OBS — ya no hay copy-paste por archivo.

**Objeto `_locale`:** cargado desde `fetch('/locales/${lang}.json')` (fallback a `es.json`). Interpolación de variables con `{var}` dentro del string.

**Markup estático:**
- `data-i18n="seccion.clave"` (aplica a `textContent`)
- `data-i18n-html` (a `innerHTML`)
- `data-i18n-placeholder` (a `placeholder`)
- `advanced.html` además soporta `data-i18n-title`

**Texto armado en JS:** `t('seccion.clave', { var: valor })`, nunca template literal con la frase en español embebida.

**Idioma elegido:** persiste en `localStorage['tikliveTTS_lang']` — no hay equivalente server-side, es puramente client-side.

### Diccionarios

`interfaz/publico/locales/{es,en,it,pt,fr,de,zh,ja,ko,ru}.json` (Vite `publicDir` — se copian tal cual a `interfaz/dist/locales/` al buildear).

**`es.json` es la fuente de verdad** — agregar la clave ahí primero, después propagar la traducción a los otros 9 (no dejar ningún idioma sin la clave nueva; la paridad de claves entre los 10 archivos es lo que se valida).

**Nombrar las claves:** `seccion.claveDescriptiva`, reusando una sección existente cuando el texto encaja ahí (`toast.*`, `conn.*`, `overlayStr.*`, etc.) en vez de crear secciones nuevas sin necesidad.

### Backend + frontend

Si una ruta HTTP devuelve un mensaje de error que el frontend muestra al usuario (`res.status(N).json({ error: '...' })` seguido en el cliente por un `showToast(data.error...)`), sumarle también `errorKey: 'errors.claveDescriptiva'` — nunca reemplazar `error` (mantiene compat con builds viejos), solo agregar la clave. 

El frontend prefiere `errorKey` traducido vía el helper `tErr(data, fallbackKey)` (definido junto a `t()` en `index.html` y `advanced.html`) y cae al texto crudo si no hay `errorKey` o no resuelve.

### Excepciones legítimas — no traducir

- Nombres de marca/plataforma (`TIKTOK`, `TWITCH`, `YOUTUBE`, `BITS`, `RAID`, `SUPERCHAT`)
- `<title>` de los overlays (solo los ve el streamer armando OBS, nunca el espectador)
- Contenido dinámico que viene del usuario (nombre de usuario, texto del chat)

**Sistemas aparte:** `core/announce-texts.js` (avisos TTS de admin/promo) y `features/idioma/` (filtro de idioma/script de voz) ya cubren sus propios idiomas — no tocar ni confundir con el i18n de UI de arriba.

### Validación

Antes de dar por terminada una función con texto nuevo: correr un script rápido que cuente claves hoja de los 10 JSON y confirme que coinciden en cantidad — un idioma con menos claves que el resto es señal de que faltó propagar algo.

## Íconos — nunca emojis en UI nueva

Los emojis que ya están en el código (`🎁`, `💾`, `🔴`, etc.) se quedan tal cual — no hay que salir a limpiarlos. Pero **de acá en adelante, código nuevo o modificado nunca usa emoji como ícono de UI** (botones, labels, badges, títulos de card). En su lugar:

1. Buscar el ícono que mejor encaje en `asset/icons/` (catálogo Material Icons completo, ~1300 SVGs — es solo fuente, la app no lo sirve).
2. Copiarlo a `interfaz/publico/icons/` (Vite `publicDir` — se copia tal cual a `interfaz/dist/icons/`, que sí sirve Express; el HTML lo referencia como `icons/nombre.svg`, con `class="icon-inline"`).
3. Usarlo con `<img class="icon-inline" src="icons/nombre.svg" alt="">`, mismo patrón que el resto de la app.

Los SVG de `asset/icons/` vienen en un solo color (negro/currentColor). Si el ícono necesita otro color para calzar con el diseño (ej. un ícono de estado en rojo/verde), está permitido copiarlo con otro nombre y editar el `fill`/`stroke` directo en el XML del SVG — son archivos de texto planos, no binarios, se editan igual que cualquier código.

## Diseño / UX — skills de referencia obligatorias

**Cada vez que se toque UX/UI del frontend o se agregue código visual nuevo** (vistas, componentes, CSS, markup, animaciones, transiciones, estados de interacción) hay que **consultar y tener presentes las skills de design engineering de Emil Kowalski:**

- `/emil-design-eng` — filosofía de pulido de UI, diseño de componentes, decisiones de detalle. Es la skill base, invocarla antes de escribir el markup/CSS.
- `/animate` — construir una animación desde cero (curva, duración, propiedades).
- `/improve-animations` — auditar animaciones existentes.
- `/find-animation-opportunities` — dónde una animación aporta de verdad (y dónde no).
- `/animation-vocabulary` — vocabulario preciso para describir el movimiento.
- `/apple-design` — principios de interfaz y movimiento fluido de Apple.

**Regla práctica:** antes de dar por cerrada una mejora visual, pasar el diff por `/improve-animations` (si hay movimiento) y por el criterio de `/emil-design-eng` (jerarquía, foco, estados `:active`/`:focus`, `transition` con propiedades explícitas nunca `all`, `ease-out` para feedback inmediato). Sigue aplicando todo lo de las secciones **i18n** e **Íconos** de arriba.
