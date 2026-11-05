# SDK `.epik` — documentación completa

Documento de referencia del sistema de overlays `.epik` de TikLiveTTS: qué es, cómo se hace un `.epik`,
la API completa del SDK v1, cómo funciona por dentro de la app y **dónde está cada archivo**.

- Parte A — Guía del SDK (la misma que viaja en el kit de Epik, `LEEME.md`).
- Parte B — Cómo lo resuelve la app por dentro.
- Parte C — Rutas de todos los archivos (kit + app).

---

# Parte A — Guía del SDK


Un **`.epik`** es un overlay hecho a medida que Epik le entrega a un streamer en **un solo archivo**.
El streamer lo suelta en el acordeón del overlay en TikLiveTTS (sección **«Archivos .epik»**) y queda
como **una skin más** de ese overlay, con la misma URL de OBS de siempre. Es gratis para todos los planes.

TikLiveTTS pone el motor (datos en vivo, conexión con TikTok/Twitch/YouTube/Kick, URL para OBS, ajustes).
El `.epik` pone **solo el diseño**: HTML + CSS + JavaScript propio, con libertad total dentro de su caja.

```
Templete Overlay/
├─ LEEME.md                 ← esta guía
├─ GUIA-CLAUDE.md           ← el patrón paso a paso para que Claude diseñe .epik a medida
├─ docs/tipos/<familia>.md  ← una ficha por familia: datos, textos, ajustes a respetar y casos de prueba
├─ sdk/
│  ├─ epik.js               ← SDK v1 (se copia solo dentro de cada paquete)
│  └─ epik-animaciones.css  ← las animaciones de entrada/salida de la app (copia)
├─ plantillas/
│  └─ <familia>/            ← una plantilla por familia (musica, ranking, contador, alerta, chat, creditos, social)
├─ herramientas/
│  ├─ empaquetar.js         ← carpeta → archivo .epik (valida igual que la app)
│  ├─ simulador.js/.html    ← prueba el diseño con datos de ejemplo, sin abrir la app
│  ├─ validar-manifest.js   ← copia de la validación de la app
│  ├─ tipos/<familia>.js    ← datos de prueba y botones del simulador de cada familia
│  └─ campos/<overlay>.json ← todos los ajustes de cada overlay (generado del esquema de la app)
└─ ejemplos/
   └─ plantilla-<familia>.epik ← las plantillas ya empaquetadas, listas para importar
```

> Todos los overlays aceptan `.epik`. Un `.epik` se hace para una **familia** (`manifest.overlay`) y aparece en
> todos los overlays de esa familia: un pack de alertas sirve para las 12 alertas (sección 9).

---

## A.1 Flujo de trabajo (de pedido a entrega)

1. **Copiar la plantilla** de la familia pedida: `plantillas/<familia>` → `clientes/<streamer>-<familia>`, y leer su ficha `docs/tipos/<familia>.md`.
2. **Cambiar el `id`** en `manifest.json` (único por diseño, ej. `luna-vibes-musica`), el `nombre` y la `medida`.
3. **Diseñar**: `index.html`, `style.css`, `script.js` y lo que haga falta en `assets/`.
4. **Probar** con el simulador:
   ```bash
   node herramientas/simulador.js clientes/luna-vibes-musica
   # abre http://localhost:3200  (?overlay=<id> abre un overlay concreto de la familia, ej. ?overlay=fin-directo)
   ```
5. **Miniatura**: abrir `http://localhost:3200/?captura=1`, sacar captura cuadrada y guardarla como `preview.webp`
   (ideal 512×512, menos de 100 KB).
6. **Empaquetar**:
   ```bash
   node herramientas/empaquetar.js clientes/luna-vibes-musica entregas/luna-vibes-musica.epik
   ```
7. **Entregar** el `.epik`. El streamer lo suelta en *Overlays → Música → Archivos .epik*. Listo.

**En la app:** cada familia trae su plantilla instalada en todas las cuentas («Plantilla Música», «Plantilla Ranking»…), no se puede
eliminar y tiene un botón para descargarla a la carpeta Descargas como punto de partida. En la lista de
«Archivos .epik» la estrella lo quita o lo vuelve a poner en favoritos (los favoritos son los que salen en el
selector de skins del lienzo) y lo importado se puede eliminar (dos clics: «¿Eliminar?» y confirmar; los overlays que
lo usaban vuelven a su skin de fábrica). Las plantillas de la app no se eliminan.

**Actualizar un diseño ya entregado:** mismo `id`, subir `version` (`1.0.0` → `1.1.0`), empaquetar y reenviar.
Al importarlo, la app reemplaza la versión anterior y **conserva los ajustes que el streamer ya tocó**
(se guardan por `id`; también sobreviven si lo quita y lo vuelve a importar).

Requisito de las herramientas: **Node 18+**. Sin dependencias, sin `npm install`.

---

## A.2 Qué lleva un `.epik`

Es un ZIP con esta forma (la extensión es `.epik`):

```
manifest.json      obligatorio
index.html         obligatorio (o el que diga "entrada")
epik.js            lo pone el empaquetador desde sdk/
epik-animaciones.css  lo pone el empaquetador desde sdk/
style.css, script.js, preview.webp, assets/…   lo que el diseño necesite
```

Límites que revisa la app: máx. **400 archivos**, **40 MB por archivo**, **80 MB en total**, carpetas de hasta
6 niveles, nombres con letras/números/`-`/`_`/`.`/espacio. Extensiones permitidas:
`html css js json txt md png jpg jpeg webp gif svg avif woff woff2 ttf otf mp3 ogg wav mp4 webm`.
Si el ZIP trae todo dentro de una sola carpeta, la app lo aplana sola.

---

## A.3 `manifest.json`

```json
{
  "formato": "epik",
  "sdk": 1,
  "id": "luna-vibes-musica",
  "overlay": "musica",
  "nombre": "Luna Vibes — Música",
  "version": "1.0.0",
  "autor": "Epik",
  "descripcion": "Reproductor neón para el canal de luna_vibes.",
  "entrada": "index.html",
  "preview": "preview.webp",
  "medida": { "ancho": 440, "alto": 150 },
  "campos": [ … ]
}
```

| Clave | Obligatoria | Regla |
|---|---|---|
| `formato` | sí | siempre `"epik"` |
| `sdk` | sí | siempre `1` |
| `id` | sí | minúsculas, números y guiones, 3 a 48 (`^[a-z0-9][a-z0-9-]{2,47}$`). **Mismo id = actualización** |
| `overlay` | sí | familia del diseño (`musica`, `ranking`, `contador`, `alerta`, `chat`, `creditos`, `social`; ver sección 9) |
| `nombre` | sí | hasta 60. Es lo que ve el streamer en la lista y en el selector de skins |
| `version` | sí | hasta 20 (usar semver: `1.2.0`) |
| `autor` | no | hasta 60 (por defecto `Epik`) |
| `descripcion` | no | hasta 200 |
| `entrada` | no | `.html` que existe en el paquete (por defecto `index.html`) |
| `preview` | no* | imagen del paquete. *Sin ella se ve sin miniatura: ponerla siempre |
| `medida` | sí | `{ ancho, alto }` enteros entre 40 y 3840: **tamaño de referencia del diseño** (ver 5.3) |
| `campos` | no | hasta 40 ajustes propios (sección 4) |

La app guarda una copia **limpia** del manifest (descarta claves que no conoce).

---

## A.4 Campos propios (`campos`)

Cada diseño puede declarar sus propios ajustes. La app los dibuja solos en la sección «Archivos .epik»
cuando ese `.epik` está en uso, los guarda por cuenta y los manda al diseño junto con los del overlay.

```json
{ "clave": "colorFondo",   "tipo": "color",  "etiqueta": "Color del fondo", "def": "#121218" }
{ "clave": "resplandor",   "tipo": "bool",   "etiqueta": "Resplandor de color", "def": true }
{ "clave": "grosorBarra",  "tipo": "numero", "etiqueta": "Grosor de la barra", "min": 2, "max": 12, "step": 1, "def": 4 }
{ "clave": "opacidad",     "tipo": "numero", "etiqueta": "Opacidad", "min": 0, "max": 1, "step": 0.05, "def": 0.8, "porcentaje": true }
{ "clave": "formaPortada", "tipo": "opcion", "etiqueta": "Forma de la portada", "opciones": ["cuadrada", "redonda"], "etiquetasOpciones": ["Cuadrada", "Redonda"], "def": "cuadrada" }
{ "clave": "textoEtiqueta","tipo": "texto",  "etiqueta": "Texto de la etiqueta", "max": 30, "def": "", "ayuda": "Vacío = «Sonando ahora»" }
```

| Tipo | Control en la app | Valor que recibe el diseño |
|---|---|---|
| `color` | selector de color | `"#rrggbb"` (def obligatorio en ese formato) |
| `bool` | interruptor | `true` / `false` |
| `numero` | deslizador (`min`, `max`, `step`; `porcentaje: true` lo muestra en %) | número |
| `opcion` | desplegable (`opciones` hasta 30; `etiquetasOpciones` opcional, mismo largo) | uno de `opciones` |
| `texto` | cuadro de texto (`max` ≤ 200) | texto |

- `clave`: letras y números, empieza con letra (`^[a-zA-Z][a-zA-Z0-9]{0,31}$`), **sin repetir** y sin pisar
  una clave del overlay (sección 6). `etiqueta` (hasta 40) y `ayuda` (hasta 120) van en el idioma del cliente.
- Viajan en la URL de OBS como `x.<clave>` y solo si difieren del `def`: URLs cortas y estables.
- **Regla de oro: todo lo que el streamer podría querer cambiar sin volver a pedirlo, es un campo.**

---

## A.5 El SDK (`epik.js`)

Script clásico que expone `window.epik`. Se carga en el `<head>`:

```html
<link rel="stylesheet" href="epik-animaciones.css">
<link rel="stylesheet" href="style.css">
<script src="epik.js"></script>
```

### 5.1 Ciclo de vida

1. El SDK carga, inyecta su CSS base y avisa a la app: `listo`.
2. La app responde con la **config** (ajustes del overlay + campos propios) y los **textos** traducidos.
3. Después llegan los datos de la familia (`cancion`, `ranking`, `alerta`, `mensaje`…, ver su ficha) y `a11y`.

```js
epik.listo(function (config) {
  // aquí ya hay config: suscribirse y pintar
  epik.on('cancion', pintar);
});
```

Si el diseño se abre suelto (sin la app ni el simulador) no recibe nada y avisa por consola.

### 5.2 API completa

**Núcleo**

| API | Qué hace |
|---|---|
| `epik.version` | `1` |
| `epik.listo(fn?)` | `fn(config)` cuando llega la config (una vez). Devuelve una `Promise` |
| `epik.on(evento, fn)` | se suscribe; **devuelve una función para desuscribirse**. Todo evento que es un **estado** (`config`, `cancion`, `ranking`, `contador`, `creditos`…) llama a `fn` al instante con el último valor; los **momentáneos** (`alerta`, `mensaje`) no se repiten |
| `epik.off(evento, fn)` | desuscribe |
| `epik.config` | la config actual (o `null` antes de `listo`) |
| `epik.movimientoReducido` | `true` si el streamer pidió reducir animaciones |
| `epik.texto(clave, vars?)` | texto traducido que manda la app (claves en la ficha de la familia) con `{variables}` |
| `epik.numero(n)` | número en el idioma del streamer: `12437` → `12.437`; desde 100.000 compacto (`1,2 M`), como la app |
| `epik.escribir(el, texto)` | pone el texto y, si no cabe, aplica lo elegido en «texto largo» (`cortar` / `desvanecer` / `desplazar`) |
| `epik.imagen(img, url, respaldo?)` | pone la imagen y cae a `respaldo` si falla (las fotos de TikTok caducan) |

**Animaciones** (usan las mismas de la app; necesitan `epik-animaciones.css`)

| API | Qué hace |
|---|---|
| `epik.animar.entrar(el)` | quita `hidden` y reproduce la animación de entrada elegida. `Promise` |
| `epik.animar.salir(el)` | reproduce la de salida y deja `hidden`. `Promise` |
| `epik.animar.cambiar(el, actualizar)` | sale → `actualizar()` → entra. Si llega otro cambio mientras sale, gana el último. Si `actualizar()` devuelve `false` el elemento queda oculto |

Respetan `animacionEntrada`, `duracionEntrada`, `animacionSalida`, `duracionSalida` y «reducir movimiento».

**Música** (`epik.musica`)

| API | Qué hace |
|---|---|
| `epik.musica.cancion` | canción actual (o `null`) |
| `epik.musica.posicion()` | segundos transcurridos, **interpolados** entre avisos de la app |
| `epik.musica.duracion()` | duración en segundos (0 si no se sabe) |
| `epik.musica.fraccion()` | 0 a 1 |
| `epik.musica.pausada()` | `true` si está en pausa |
| `epik.musica.formatear(s)` | `264` → `"4:24"` (`"1:02:03"` si pasa la hora) |
| `epik.musica.barra({ relleno, transcurrido, total, contenedor })` | barra que se mueve sola: escala `relleno` en X, escribe los tiempos y oculta `contenedor` sin duración. Todo opcional. Devuelve `detener()` |
| `epik.musica.video(videoEl, { alCargar, alQuitar })` | video mudo del tema sincronizado con la música (solo si el streamer activó «mostrar video»). Reintenta solo mientras la app lo descarga. `alCargar` para mostrarlo sobre la portada |
| `epik.musica.pedidaPor(nombre)` | «pedida por luna_vibes» en el idioma del streamer |

### 5.3 CSS base que inyecta el SDK

```html
<div class="epik-escena">        <!-- pantalla completa: posiciona según posicionH / posicionV + desplazamientos -->
  <div class="epik-lienzo">      <!-- mide manifest.medida y se escala (zoom) a la fuente de OBS -->
    … el diseño …
  </div>
</div>
```

- `.epik-lienzo` ya aplica la tipografía elegida (fuente, peso, cursiva, mayúsculas, espaciados, sombra,
  contorno, alineación). El CSS del diseño puede pisarlo.
- **Escalado**: igual que los overlays de la app. El diseño se dibuja a `medida` y se escala entero según
  la fuente de OBS (en 1920×1080 crece hasta 1,5×), multiplicado por el ajuste `escala`. Diseñar en px a la medida.
- El contenido puede salirse del lienzo (ej. una cola que crece hacia abajo); la medida es la referencia del zoom.
- `.epik-texto`, `.epik-desborda`: los usa `epik.escribir`.
- `.epik-reducir-movimiento` en `<body>` corta animaciones y transiciones.
- `:root { color-scheme: normal }` y fondo transparente. **No cambiar `color-scheme`**: con otro valor el
  navegador pinta el iframe opaco y en OBS aparece un rectángulo.

### 5.4 Cómo llega la config al CSS (sin escribir JS)

| Tipo de valor | Se publica como | Ejemplo |
|---|---|---|
| número o color | variable `--epik-<clave-en-kebab>` en `:root` | `color` → `--epik-color`, `colorFondo` → `--epik-color-fondo` |
| `true`/`false` | clase `epik-<clave-en-kebab>` en `<body>` cuando es `true` | `.epik-mostrar-barra` |
| texto u opción | atributo `data-<clave>` en `<body>` | `[data-lado-portada="derecha"]` |

Variables ya resueltas: `--epik-fuente`, `--epik-peso`, `--epik-mayusculas`, `--epik-cursiva`,
`--epik-subrayado`, `--epik-letras`, `--epik-palabras`, `--epik-sombra`, `--epik-contorno`, `--epik-alinear`,
`--epik-x`, `--epik-y`, `--epik-dx`, `--epik-dy`, `--epik-zoom`, `--epik-ancho`, `--epik-alto`,
`--entrada-ms`, `--salida-ms`.

```css
.tarjeta { background: color-mix(in srgb, var(--epik-color-fondo) calc(var(--epik-bg) * 100%), transparent); }
body:not(.epik-mostrar-barra) .barra { display: none; }
[data-lado-portada="derecha"] .portada { order: 2; }
```

### 5.5 Protocolo (por si se quiere ir sin SDK)

`window.postMessage` entre la app y el iframe, siempre `{ epik: 1, tipo, datos }`:

| Dirección | `tipo` | `datos` |
|---|---|---|
| diseño → app | `listo` | — |
| app → diseño | `config` | `{ config, textos }` |
| app → diseño | `a11y` | `{ movimientoReducido }` |
| app → diseño | los de su familia (`cancion`, `ranking`, `contador`, `alerta`, `mensaje`, `creditos`, `social`) | ver su ficha (sección 7) |

Tipos desconocidos llegan igual como eventos (`epik.on('<tipo>', fn)`): así un diseño viejo no se rompe
cuando la app agregue datos nuevos.

---

## A.6 Ajustes del overlay (todos llegan en `config`)

Además de los campos propios, el diseño recibe **todos** los ajustes que el streamer toca en el panel del overlay,
y además `tipo` (la familia), `overlay` (el overlay concreto: `likes`, `bits`, `chat-kick`…), `idioma` y `medida`.
Un buen `.epik` los respeta (las plantillas lo hacen). Cada familia los lista en su ficha; la lista completa de cada
overlay está en `herramientas/campos/<overlay>.json` (se regenera desde la app con `node scripts/exportar-campos-epik.js`).

Comunes a casi todos: `color` (acento), `bg` (opacidad del fondo), `escala` (el SDK la aplica), tipografía
(`fuente`, `peso`, `mayusculas`, `cursiva`, `subrayado`, espaciados, contorno, sombra: el SDK los aplica en
`.epik-lienzo`), posición (`posicionH`, `posicionV`, `desplazaX`, `desplazaY`: el SDK posiciona `.epik-escena`) y,
donde existen, `animacionEntrada`/`duracionEntrada`/`animacionSalida`/`duracionSalida` (las usa `epik.animar`).

---

## A.7 Datos de cada familia

Cada familia tiene su ficha con el contrato exacto de sus datos, los textos traducidos que llegan, los ajustes que
hay que respetar, los casos que hay que probar y el esqueleto de `script.js`:

| Familia (`manifest.overlay`) | Overlays donde aparece el `.epik` | Evento(s) | Ficha |
|---|---|---|---|
| `musica` | Música | `cancion`, `progreso`, `cola` | `KIT/docs/tipos/musica.md` |
| `ranking` | Top Likers, Top Donadores | `ranking` | `KIT/docs/tipos/ranking.md` |
| `contador` | Seguidores, Espectadores, Contador de Likes | `contador` | `KIT/docs/tipos/contador.md` |
| `alerta` | Alertas de regalos, alertas sociales y las 10 alertas de evento | `alerta` (la app lleva la cola) | `KIT/docs/tipos/alerta.md` |
| `chat` | Chat unificado y los chats de TikTok, Twitch, YouTube y Kick | `mensaje` | `KIT/docs/tipos/chat.md` |
| `creditos` | Créditos | `creditos` | `KIT/docs/tipos/creditos.md` |
| `social` | Social (últimos seguidores y compartidos) | `social` | `KIT/docs/tipos/social.md` |

Reglas comunes a todos los datos: nombres en español, URLs absolutas, foto con `avatarRespaldo` (nunca falla) y
`null` en lo que no se sabe. Un diseño solo recibe lo de su familia.

---

## A.8 Seguridad (lo que el diseño puede y no puede hacer)

El diseño corre en un **iframe con sandbox** y una política de contenido estricta. Es lo que permite que el
archivo sea abierto y libre sin poner en riesgo al streamer.

| Permitido | Bloqueado |
|---|---|
| JS propio (scripts del paquete o inline) | `fetch`, `XMLHttpRequest`, WebSocket (**sin red**) |
| CSS, fuentes e imágenes del paquete | la API de la app (banear, config, chat, etc.) |
| Imágenes de internet por `https:` (portadas, avatares) | iframes, formularios, abrir ventanas |
| Google Fonts | cookies, `localStorage` del origen de la app |
| Video/audio del paquete y de la app (`/api/music/video`) | scripts de otros dominios (no hay CDN: incluir las librerías en el paquete) |

Consecuencias prácticas:
- **Todo recurso va dentro del paquete** (librerías JS, fuentes propias, imágenes, sonidos).
- `localStorage` no persiste (origen opaco): el estado se guarda en `campos`, no en el navegador.
- Un diseño solo recibe los datos de **su** overlay: uno de música nunca ve el chat.

---

## A.9 Familias de overlay

| Familia (`manifest.overlay`) | Overlays donde aparece el `.epik` | Evento(s) | Ficha |
|---|---|---|---|
| `musica` | Música | `cancion`, `progreso`, `cola` | `KIT/docs/tipos/musica.md` |
| `ranking` | Top Likers, Top Donadores | `ranking` | `KIT/docs/tipos/ranking.md` |
| `contador` | Seguidores, Espectadores, Contador de Likes | `contador` | `KIT/docs/tipos/contador.md` |
| `alerta` | Alertas de regalos, alertas sociales y las 10 alertas de evento | `alerta` (la app lleva la cola) | `KIT/docs/tipos/alerta.md` |
| `chat` | Chat unificado y los chats de TikTok, Twitch, YouTube y Kick | `mensaje` | `KIT/docs/tipos/chat.md` |
| `creditos` | Créditos | `creditos` | `KIT/docs/tipos/creditos.md` |
| `social` | Social (últimos seguidores y compartidos) | `social` | `KIT/docs/tipos/social.md` |

Un `.epik` aparece en **todos** los overlays de su familia. Soltarlo en el acordeón de otra familia lo rechaza con un
aviso que dice dónde va. Cada familia trae su plantilla integrada en la app (`plantilla-<familia>`, no se elimina,
se descarga): los ids `plantilla-*` están reservados.

---

## A.10 Checklist antes de entregar

- [ ] `id` único del cliente (`<canal>-<familia>`) y `version` subida si es actualización.
- [ ] `preview.webp` nítido, cuadrado, menos de 100 KB.
- [ ] Probado en el simulador con **todos los casos de la ficha** de su familia y con cada overlay del selector,
      16:9 y 9:16, fondo verde.
- [ ] Respeta los ajustes del overlay que pide la ficha (al menos: colores, mostrar/ocultar, animaciones, posición).
- [ ] Lo que el cliente podría querer cambiar está en `campos`, con etiquetas en su idioma.
- [ ] Sin recursos de internet salvo imágenes `https:` y Google Fonts.
- [ ] `node herramientas/empaquetar.js …` sin errores ni avisos.
- [ ] Importado en TikLiveTTS: se ve en la vista previa, en el selector de skins y en OBS.

---

# Parte B — Cómo lo resuelve la app por dentro

## B.1 Recorrido completo

```
Streamer suelta el .epik en Overlays → Música → «Archivos .epik»   (ejemplo con la familia musica)
  └─ vistas/principal/epik/seccion.js  →  POST /api/epik/importar?overlay=musica  (cuerpo = el archivo)
       └─ features/epik/store.js
            read-zip.js            lee el ZIP (sin dependencias)
            validate-manifest.js   valida y limpia el manifest
            escribe en <userData>/accounts/<cuenta>/epik/paquetes/<id>/  (+ registro.json)
  └─ la skin pasa a ser  epik:<id>  (appSettings.overlays.musica.skin)
  └─ la URL de OBS:  /overlay-musica.html?skin=epik%3A<id>&...&x.<clave>=<valor>

OBS abre la URL
  └─ overlay-musica-entrada.js  →  skin epik → compartido/epik/anfitrion-musica.js
       ├─ lee la config del overlay (esquema de música) + los x.<clave> del manifest
       ├─ compartido/epik/anfitrion.js monta <iframe sandbox="allow-scripts" src="/epik/<id>/index.html">
       │     GET /epik/<id>/*  → CSP: sandbox allow-scripts; connect-src 'none'; …
       └─ compartido/fuente-musica.js (la misma capa de datos del overlay nativo)
             WS del servidor + /api/music/queue + muestras de vista previa
             → postMessage { epik: 1, tipo: 'cancion'|'progreso'|'cola'|'a11y', datos }
  └─ dentro del iframe: epik.js (SDK) → eventos, variables CSS, ayudas → el diseño pinta
```

## B.2 Backend — dominio `features/epik/`

| Ruta | Qué hace |
|---|---|
| `GET /api/epik?overlay=` | `{ ok, soportados, familias, epiks[] }` (`familias` = `FAMILIAS`; con `overlay`, los `.epik` de su familia). Antes de listar instala/actualiza las plantillas de la app en la cuenta |
| `POST /api/epik/importar?overlay=` | importa o actualiza. Errores: `400 errors.epikInvalido`, `409 errors.epikOtroOverlay` si `familiaDe(overlay) !== manifest.overlay` (+ `overlay` = primer overlay de su familia, `familia`, `nombre`), `422 errors.epikNoSoportado` (familia que no existe), `403 errors.epikIntegrado` (id reservado por una plantilla de la app) |
| `POST /api/epik/:id/descargar` | solo plantillas de la app: copia el `.epik` a `~/Downloads` sin pisar archivos (`nombre (1).epik`) → `{ ok, archivo, ruta }` |
| `DELETE /api/epik/:id` | quita un `.epik` importado (botón de la papelera en la lista, con confirmación en dos clics; también el MCP). Las plantillas de la app → `403` |
| `GET /epik/:id/*` | sirve los archivos del paquete con CSP de sandbox, `Access-Control-Allow-Origin: *`, `nosniff`, `no-cache` |

Tools MCP: `epik_list` (lectura), `epik_import` (ruta local de un `.epik`), `epik_delete` (destructiva).
Cada importación/borrado avisa por WS `epik-changed` y la UI recarga la lista.

**Familias:** `validate-manifest.js#FAMILIAS` = `{ familia: [overlays] }` es la fuente única de qué overlays
aceptan `.epik`; `familiaDe(overlay)` resuelve la familia. La UI la lee de `GET /api/epik`.

**Plantillas de la app (integradas):** una por familia, `epik/plantilla-<familia>.epik` en la raíz del repo
(`INTEGRADOS` se deriva de `FAMILIAS`; un test exige que exista la de cada familia), empaquetadas por
`extraResources` (`<resources>/epik/`). `store.js#asegurarIntegrados` la instala en cada cuenta y la
reinstala solo si cambió el archivo (hash sha1). Llevan `integrado: true`: no se eliminan, no se pueden
pisar con otro `.epik` del mismo id y se descargan.

**Datos por cuenta:** `accountDataPath('epik', 'registro.json')` y `accountDataPath('epik', 'paquetes', id)`.

## B.3 Overlay (lo que ve OBS)

Mismo patrón en cada familia: el overlay nativo y el `.epik` comparten la **capa de datos** (`fuente-*.js`, sin
cambio visible para el nativo) y el **anfitrión** de la familia traduce esos datos al contrato público.

| Familia | Entrada (`interfaz/`) | Capa de datos (`compartido/`) | Anfitrión (`compartido/epik/`) |
|---|---|---|---|
| `musica` | `overlay-musica-entrada.js` | `fuente-musica.js` | `anfitrion-musica.js` |
| `ranking` | `overlay-likes.js`, `overlay-donadores.js` | `fuente-ranking.js` | `anfitrion-ranking.js` |
| `contador` | `overlay-seguidores.js`, `overlay-viewers.js`, `overlay-contador-likes.js` | `fuente-contador.js` | `anfitrion-contador.js` |
| `alerta` | `overlay-alertas.js`, `overlay-alertas-social.js`, `overlay-evento.js` | `fuente-alerta.js` (+ `imagen-regalo.js`) | `anfitrion-alerta.js` (lleva la cola: `alerta` → `null` tras `duracion`) |
| `chat` | `overlay-chat.js` (también los de una plataforma) | `fuente-chat.js` | `anfitrion-chat.js` |
| `creditos` · `social` | `overlay-creditos.js`, `overlay-social.js` | `fuente-creditos.js` | `anfitrion-creditos.js` |

- Cada `overlay-*.js` llama `elegirEntrada({ nativo, epik })` (`compartido/epik/anfitrion.js`): con skin `epik:<id>`
  importa el anfitrión, si no corre `nativo()`.
- `prepararEpik({ familia, overlay, textos, nativo })` hace lo común: config del overlay (su esquema), textos
  traducidos, montar el iframe y la accesibilidad. Si el paquete falta, está roto o es de otra familia, arranca
  el nativo.
- `montarEpik` arma la config (`{ tipo: familia, overlay, idioma, medida, …ajustes, …campos propios }`), crea el
  iframe y guarda en orden todo lo que se envía hasta el primer `listo` (tope 200); si el diseño se recarga, le
  reenvía el último valor de cada tipo.
- `overlay-social.js` conserva su propia lógica de lista (cuenta eventos, no personas); el `.epik` social usa
  `fuente-creditos.js` (personas únicas).

## B.4 Interfaz de la app

- `vistas/principal/epik/seccion.js` — último acordeón «Archivos .epik» de cada overlay que los acepta:
  zona para soltar o elegir el archivo, lista instalada con **Usar**, **estrella de favorito**, **eliminar** (solo lo importado: dos clics, y los overlays que lo usaban vuelven a su skin de fábrica) y **Descargar** en la plantilla de la app; y los ajustes propios del `.epik` en uso.
- `vistas/principal/epik/estado.js` — lista instalada, favoritos (`appSettings.epikOcultos` = ids quitados
  de favoritos), ajustes propios (`appSettings.epik[id]`, por id: sobreviven a actualizaciones) y
  `queryEpik()` para sumar `x.<clave>` a la URL del overlay.
- `vistas/principal/epik/campos-epik.js` — dibuja los ajustes propios del manifest (todo por `textContent`:
  las etiquetas vienen del archivo).
- `vistas/principal/epik/popup-otro-overlay.js` — aviso cuando el archivo es de otro overlay, con el botón
  para agregarlo donde corresponde (se verá cuando haya más de un tipo soportado).
- `vistas/principal/selector-skin.js` — los `.epik` **favoritos** aparecen en el selector del lienzo con su miniatura.
- `campos-overlay/index.js` — monta la sección al final de los acordeones y la redibuja al cambiar de skin.
- `configurador-overlays.js#buildOverlayUrl` — agrega `queryEpik(tipo)` a la URL.
- `nucleo/ws/cliente-ws.js` — `epik-changed` recarga la lista.
- Textos: `overlayCfg.epik.*`, `errors.epik*`, `mcp.toolDesc.epik_*`, `mcp.domain.epik` en los 10 idiomas.

## B.4b Ícono y doble clic en Windows

- El instalador (electron-builder `build.fileAssociations` en `package.json`) registra la extensión `.epik`
  con el ícono `build/epik.ico` (fuente: `build/epik-icono.svg`; tamaños 16 a 256 px). Se ve después de
  instalar o actualizar con el instalador; en modo desarrollo Windows no conoce la extensión.
- Doble clic en un `.epik` → Windows abre TikLiveTTS con la ruta en los argumentos (o se la pasa a la
  instancia que ya corre, evento `second-instance`). `electron-shell/abrir-epik.js` lo importa por
  `POST /api/epik/importar` (sin `overlay`: va a su propio overlay) y entrega el resultado al renderer por IPC
  `epik-abierto`. Si la UI todavía no escucha, el resultado espera en cola y la UI lo pide al suscribirse
  (`ipcMain.handle('epik:pendientes')`, `preload.js#onEpikAbierto`).
- La UI (`vistas/principal/epik/seccion.js#alAbrirEpik`) muestra el mismo aviso que al soltarlo en el
  acordeón y, si es nuevo, lo deja puesto como skin.
- Regenerar el ícono: renderizar el SVG a 1024×1024 con fondo transparente, bajar a 16/20/24/32/40/48/64/96/128/256
  y juntar los PNG en un `.ico` (entradas PNG).

## B.5 Seguridad

| Capa | Qué evita |
|---|---|
| iframe `sandbox="allow-scripts"` (sin `allow-same-origin`) | origen opaco: no toca cookies, storage ni el DOM de la app |
| CSP `sandbox allow-scripts` en `/epik/*` | lo mismo aunque se abra la URL suelta |
| CSP `connect-src 'none'`, `frame-src 'none'`, `form-action 'none'` | sin red, sin iframes, sin formularios |
| guard de `/api/*` (loopback + origen) | un `Origin: null` del diseño se rechaza |
| datos por `postMessage` filtrados por tipo | un diseño de música nunca recibe el chat |
| validación del ZIP | rutas fuera de la carpeta, extensiones raras, tamaños, zip cifrado o roto |
| UI con `textContent` | nombres y etiquetas del archivo no se inyectan como HTML |

## B.6 Tests

- `test/epik-store.test.js`: importar, actualizar conservando fecha, familia equivocada (409), familia inexistente
  (422), rutas/extensiones peligrosas, zip con carpeta raíz, `rutaArchivo` encerrado, CSP, plantillas integradas
  (una por familia, se instalan solas, no se eliminan ni se pisan, se descargan sin sobrescribir).
- `test/epik-familias.test.js`: los overlays de `FAMILIAS` son exactamente los que tienen `aceptaEpik` en su skin
  (`CON_EPIK` de `esquemas.js`), y la familia `alerta` cubre todo `EVENTOS_ALERTA`.

## B.7 Agregar una familia u overlay nuevo

**Overlay nuevo en una familia que ya existe** (ej. una alerta de evento nueva): sumarlo a `FAMILIAS` en
`features/epik/validate-manifest.js` y a `CON_EPIK` en `interfaz/compartido/estilo/esquemas.js` (el test de
familias falla si no coinciden); su `overlay-*.js` llama `elegirEntrada`; regenerar los ajustes del kit con
`node scripts/exportar-campos-epik.js` y sumarlo a `overlays` de `KIT/herramientas/tipos/<familia>.js`.

**Familia nueva:**
1. `FAMILIAS` (backend) + `CON_EPIK` (frontend).
2. Capa de datos `interfaz/compartido/fuente-<familia>.js` extraída del overlay nativo; el nativo pasa a usarla.
3. Anfitrión `interfaz/compartido/epik/anfitrion-<familia>.js` con `prepararEpik`: nombres en español, URLs
   absolutas, `avatarRespaldo` con `avatar-generado.js`, textos traducidos, nada que no sea de la familia.
4. `elegirEntrada` en los `overlay-*.js` de la familia.
5. Kit: `plantillas/<familia>/`, `herramientas/tipos/<familia>.js`, ficha `docs/tipos/<familia>.md`, fila en la
   tabla de familias (LEEME §9), `node scripts/exportar-campos-epik.js`.
6. Plantilla integrada: `node herramientas/empaquetar.js plantillas/<familia> ejemplos/plantilla-<familia>.epik` y
   copiarla a `epik/` del repo (`INTEGRADOS` la toma sola).
7. SDK: ayudas de la familia en `epik.js` solo si hacen falta (hoy solo `epik.musica`).

---

# Parte C — Rutas de todos los archivos

## C.1 Kit de Epik (fuera del repo)

Carpeta: `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\`

| Archivo | Qué es |
|---|---|
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\LEEME.md` | guía del SDK (Parte A) |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\GUIA-CLAUDE.md` | patrón para que Claude diseñe `.epik` a medida |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\sdk\epik.js` | SDK v1 |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\sdk\epik-animaciones.css` | animaciones de la app (copia de `interfaz/compartido/estilo/animaciones.css`) |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\docs\tipos\<familia>.md` | ficha de cada familia: datos, textos, ajustes, casos de prueba |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\plantillas\<familia>\` | plantilla de cada familia (`manifest.json`, `index.html`, `style.css`, `script.js`, `preview.webp`) |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\herramientas\empaquetar.js` | carpeta → `.epik` |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\herramientas\simulador.js` | servidor de pruebas (puerto 3200) |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\herramientas\simulador.html` | panel del simulador (`?captura=1` para miniaturas) |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\herramientas\validar-manifest.js` | copia de la validación de la app |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\herramientas\campos\<overlay>.json` | ajustes de cada overlay (generado con `scripts/exportar-campos-epik.js`) |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\herramientas\tipos\<familia>.js` | datos de prueba y botones del simulador por familia (`comun.js` = lo compartido) |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\herramientas\miniatura.js` | genera `preview.webp` 512×512 con Edge o Chrome sin ventana |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\ejemplos\plantilla-<familia>.epik` | plantillas empaquetadas |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\clientes\<id>\` | diseños a medida en curso (los crea `/epik nuevo`) |
| `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay\entregas\<id>.epik` | `.epik` listos para enviar |
| `C:\Users\liber\.claude\skills\epik\SKILL.md` | skill `/epik` de Claude Code (todo el flujo dentro del kit) |

## C.2 App — archivos nuevos

Repo: `C:\Users\liber\OneDrive\Documentos\tiktok-tts\`

| Archivo | Qué es |
|---|---|
| `features/epik/index.js` | dominio: rutas, servir paquetes, tools MCP |
| `features/epik/store.js` | importar, listar, eliminar, plantillas integradas, descargar |
| `features/epik/read-zip.js` | lector ZIP |
| `features/epik/validate-manifest.js` | validación del manifest + `FAMILIAS`, `familiaDe` |
| `features/epik/content-policy.js` | CSP de los paquetes |
| `epik/plantilla-<familia>.epik` | plantillas integradas que viajan con la app (una por familia) |
| `build/epik.ico` | ícono de los archivos `.epik` en Windows |
| `build/epik-icono.svg` | fuente del ícono |
| `electron-shell/abrir-epik.js` | importa los `.epik` abiertos con doble clic |
| `interfaz/overlay-musica-entrada.js` | elige overlay nativo o anfitrión `.epik` |
| `interfaz/compartido/fuente-musica.js` | capa de datos de música compartida |
| `interfaz/compartido/epik/skin-epik.js` | `epik:<id>`, `x.<clave>`, utilidades |
| `interfaz/compartido/epik/anfitrion.js` | anfitrión genérico (iframe + protocolo) |
| `interfaz/compartido/epik/anfitrion-<familia>.js` | anfitrión de cada familia (contrato de datos): `musica`, `ranking`, `contador`, `alerta`, `chat`, `creditos` (también social) |
| `interfaz/compartido/fuente-{ranking,contador,alerta,chat,creditos}.js` | capas de datos compartidas con los overlays nativos |
| `interfaz/compartido/imagen-regalo.js` | imagen local de un regalo de TikTok por nombre |
| `scripts/exportar-campos-epik.js` | escribe `KIT/herramientas/campos/<overlay>.json` y copia `validar-manifest.js` al kit |
| `test/epik-familias.test.js` | `FAMILIAS` ↔ `aceptaEpik` y alertas de evento |
| `interfaz/src/vistas/principal/epik/estado.js` | estado de la UI, favoritos, ajustes propios, descarga |
| `interfaz/src/vistas/principal/epik/seccion.js` | acordeón «Archivos .epik» |
| `interfaz/src/vistas/principal/epik/campos-epik.js` | ajustes propios del `.epik` en uso |
| `interfaz/src/vistas/principal/epik/popup-otro-overlay.js` | aviso de overlay equivocado |
| `test/epik-store.test.js` | tests del backend |
| `docs/epik-sdk.md` | este documento |

## C.3 App — archivos modificados

| Archivo | Cambio |
|---|---|
| `server.js` | `mount('epik', './features/epik')` |
| `package.json` | `extraResources` incluye `epik/`; `fileAssociations` registra `.epik` con su ícono |
| `main.js` | crea el abridor de `.epik` y le pasa los argumentos (arranque y segunda instancia) |
| `preload.js` | `onEpikAbierto` |
| `interfaz/src/vistas/principal/eventos-electron.js` | escucha `onEpikAbierto` |
| `CLAUDE.md` | sección «Archivos `.epik`» y el dominio en el árbol |
| `interfaz/overlay-musica.html` | carga `overlay-musica-entrada.js` |
| `interfaz/overlay-musica.js` | usa `fuente-musica.js` (sin cambios visibles) |
| `interfaz/compartido/estilo/tipos-campo.js` | la opción `skin` acepta `epik:<id>` si el campo tiene `aceptaEpik` |
| `interfaz/compartido/estilo/esquemas.js` | `CON_EPIK`: `aceptaEpik: true` en la skin de cada overlay con familia |
| `interfaz/overlay-{likes,donadores,seguidores,viewers,contador-likes,alertas,alertas-social,evento,chat,creditos,social}.js` | `elegirEntrada` + su capa de datos `fuente-*.js` (sin cambios visibles) |
| `interfaz/src/nucleo/estado/ajustes-app.js` | `epik: {}`, `epikOcultos: []` y su carga |
| `interfaz/src/nucleo/ws/cliente-ws.js` | `epik-changed` |
| `interfaz/src/vistas/principal/index.js` | `iniciarEpik()` |
| `interfaz/src/vistas/principal/campos-overlay/index.js` | monta la sección, `ponerSkin()` |
| `interfaz/src/vistas/principal/configurador-overlays.js` | URL con `queryEpik()` |
| `interfaz/src/vistas/principal/selector-skin.js` | `.epik` favoritos en el selector |
| `interfaz/src/estilos/campos-overlay.css` | estilos de la sección |
| `interfaz/src/estilos/overlays-catalogo.css` | miniatura `.epik` en el selector |
| `interfaz/publico/locales/{es,en,pt,it,fr,de,ru,zh,ja,ko}.json` | textos `overlayCfg.epik.*`, `errors.epik*`, MCP |

## C.4 Datos en la máquina del streamer

| Ruta | Qué guarda |
|---|---|
| `%APPDATA%\tiktok-live-tts\accounts\<cuenta>\epik\registro.json` | `.epik` instalados en la cuenta |
| `%APPDATA%\tiktok-live-tts\accounts\<cuenta>\epik\paquetes\<id>\` | archivos de cada paquete |
| `localStorage` (por cuenta) `tikliveTTS_v1` → `epik`, `epikOcultos` | ajustes propios por id y favoritos |
| `~\Downloads\plantilla-<familia>.epik` | descarga de una plantilla |
