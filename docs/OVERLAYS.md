# Overlays — Archivos .epik y esquema de ajustes

## Archivos `.epik` (`features/epik/`)

Overlays a medida que Epik entrega como un archivo (ZIP con `manifest.json` + HTML/CSS/JS). El streamer lo suelta en el último acordeón del overlay («Archivos .epik») y queda como skin `epik:<id>` (gratis, por cuenta). Hoy solo `musica` (`OVERLAYS_SOPORTADOS` en `validate-manifest.js`; la UI lo lee de `GET /api/epik`).

### Backend

- `read-zip.js` (lector ZIP propio, sin deps) → `validate-manifest.js` → `store.js`
- Extrae a `accountDataPath('epik','paquetes',id)`
- Registro `registro.json`, mismo id = actualización

**Rutas:**
- `GET /api/epik`
- `POST /api/epik/importar?overlay=` (409 + `overlay` si es de otro acordeón)
- `DELETE /api/epik/:id`
- `GET /epik/:id/*` con CSP `sandbox allow-scripts` + `connect-src 'none'` (`content-policy.js`)

**Tools MCP:** `epik_list|import|delete`

### Overlay

`overlay-musica-entrada.js` elige entre el overlay nativo y `compartido/epik/anfitrion-musica.js`, que:
- Monta el diseño en un iframe sandbox
- Le pasa por `postMessage` (`{epik:1,tipo,datos}`) la config del overlay
- Envía campos propios (`x.<clave>` en la URL)
- Envía datos de `compartido/fuente-musica.js` (la misma capa de datos que usa el overlay nativo)

El diseño nunca ve la API ni datos de otros overlays.

### UI

`vistas/principal/epik/`:
- Sección
- Ajustes propios en `appSettings.epik[id]` — por id, sobreviven a actualizaciones
- Popup de acordeón equivocado
- Selector de skins

**Documentación completa:** `docs/epik-sdk.md` (SDK + interno + rutas)

**Plantilla integrada:** `epik/plantilla-musica.epik` (no se elimina, se descarga)

Lo importado se elimina desde la lista (dos clics; los overlays que lo usaban vuelven a su skin de fábrica); la estrella solo lo quita de favoritos = selector de skins.

**Recursos:** SDK, guía, plantilla, simulador y empaquetador viven fuera del repo, en `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay` (`LEEME.md`, `GUIA-CLAUDE.md`).

## Overlays de OBS — esquema de ajustes (`interfaz/compartido/estilo/`)

Chat, Top Likers y Top Donadores se personalizan con un **esquema declarativo** (`esquemas.js` + `campos-*.js`): cada campo `{ clave, param, tipo, def, grupo }` es la única fuente de su default, su nombre en la URL y su control en el configurador.

`construirQuery`/`leerConfig` (`query.js`, puras y testeadas) convierten config ↔ querystring omitiendo defaults; `ajustes-app.js` deriva `DEFAULTS_OVERLAYS` del esquema.

**Para agregar un ajuste:** un campo en el esquema + sus claves `overlayCfg.campo.<clave>` en los 10 locales; el panel "Personalizar" (`vistas/principal/campos-overlay/`) lo dibuja solo.

Los params históricos (`rows,color,bg,size,maxmsgs,usernames,platforms`) no se renombran.

### Rankings

El **servidor es la fuente de verdad** (`top-likers`/`top-donors` por WS, snapshot en `/api/overlay-stats`); `compartido/iniciar-ranking.js` + `leaderboard.js` solo pintan.

### Avatares y roles

Avatar y roles (moderador/suscriptor) salen de `raw` en `features/chat/author-meta/` (chat-guard no los transporta). 

El avatar de TikTok lo decodifica `@tiklivetts/tiktok-live-client` (`avatarUrl`, desde v0.1.10); las URLs son firmadas y caducan → placeholder. TikTok no informa moderadores.

### Fuentes

Google Fonts por CDN, solo desde `cargarFuente()` (`fuentes.js`); el default es la del sistema.
