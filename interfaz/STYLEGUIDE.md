# Guía de estilo de la interfaz

Referencia rápida para mantener consistente la UI ESM/Vite de TikTok TTS. Reutilizar tokens y clases existentes antes de añadir CSS.

## Colores

No hardcodear `#F0213A`: usar `--accent` para el acento contextual o `--brand` para el rojo fijo de marca. En `#view-chat`, `--accent` se redefine a verde.

| Variable | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#171717` | Fondo general. |
| `--bg-button` | `#0f0f0f` | Fondo de inputs y controles oscuros. |
| `--surface` | `#1a1a1a` | Superficie estándar. |
| `--surface-0` | `#131315` | Superficie más baja. |
| `--surface-1` | `#1a1a1a` | Alias semántico de superficie estándar. |
| `--surface-2` | `#1e1e1e` | Superficie secundaria, p. ej. tarjetas de donación y QR. |
| `--surface-3` | `#242424` | Superficie elevada para dropdowns bajo transparencia reducida. |
| `--surface-raised` | `#2c2c2c` | Estado activo/hover elevado. |
| `--surface-speaking` | `#1c1c1c` | Texto o contraste dentro de tarjetas Soundpad claras. |
| `--surface-deep` | `#222222` | Superficie profunda especializada. |
| `--toast-bg` | `#2e2e2e` | Fondo de toast. |
| `--glass` | `rgba(41, 41, 41, 0.84)` | Superficie translúcida. |
| `--scrim` | `rgba(0, 0, 0, 0.8)` | Velo de modal. |
| `--scrim-soft` | `rgba(0, 0, 0, 0.5)` | Velo suave. |
| `--border-subtle` | `#242424` | Separadores y bordes de bajo contraste. |
| `--border` | `#2e2e2e` | Borde estándar de cards y controles. |
| `--border-strong` | `#363636` | Bordes de inputs/controles y estados más definidos. |
| `--divider` | `rgba(255, 255, 255, 0.08)` | Divisor translúcido. |
| `--text` | `#fafafa` | Texto principal. |
| `--text-bright` | `#F2F2F2` | Texto destacado o activo. |
| `--text-secondary` | `#b4b4b4` | Texto secundario y labels. |
| `--text-muted` | `#898989` | Texto terciario, ayudas y controles inactivos. |
| `--muted` | `#898989` | Alias legado de texto terciario. |
| `--text-bright-a30` | `rgba(242, 242, 242, 0.30)` | Borde de hover/activo claro. |
| `--hover-1` | `rgba(255, 255, 255, 0.04)` | Hover muy sutil. |
| `--hover-05` | `rgba(255, 255, 255, 0.05)` | Fondo tenue, p. ej. pill limpio. |
| `--hover-2` | `rgba(255, 255, 255, 0.06)` | Hover de menú. |
| `--hover-3` | `rgba(255, 255, 255, 0.10)` | Hover de mayor énfasis. |
| `--hover-15` | `rgba(255, 255, 255, 0.15)` | Fondo/borde de badge TikTok. |
| `--hover-20` | `rgba(255, 255, 255, 0.20)` | Borde claro de cards secundarias. |
| `--accent` | `#F0213A` | CTA, activo y foco; en `#view-chat`: `#3ecf8e`. |
| `--accent-link` | `#F0213A` | Links de acento; en `#view-chat`: `#00c573`. |
| `--accent-border` | `rgba(240, 33, 58, 0.3)` | Borde asociado al acento; verde en `#view-chat`. |
| `--brand` | `#F0213A` | Rojo fijo de marca, incluso si cambia el acento de la vista. |
| `--brand-hover` | `#d81830` | Hover de CTA de marca. |
| `--brand-a05` | `rgba(240, 33, 58, 0.05)` | Fondo o pulso de marca muy sutil. |
| `--brand-a10` | `rgba(240, 33, 58, 0.10)` | Fondo de opción activa/hover de marca. |
| `--brand-a12` | `rgba(240, 33, 58, 0.12)` | Fondo de marca y anillo de foco. |
| `--brand-a15` | `rgba(240, 33, 58, 0.15)` | Fondo de estado activo. |
| `--brand-a20` | `rgba(240, 33, 58, 0.20)` | Anillo de estado online. |
| `--brand-a30` | `rgba(240, 33, 58, 0.30)` | Borde de marca. |
| `--brand-a40` | `rgba(240, 33, 58, 0.40)` | Borde de foco/activo fuerte. |
| `--brand-green` | `#3ecf8e` | Verde de marca legado. |
| `--green` | `#F0213A` | Alias legado; se vuelve `#3ecf8e` en chat. Preferir `--accent` o un token semántico. |
| `--ok` | `#3ecf8e` | Éxito/conectado. |
| `--ok-link` | `#00c573` | Link de éxito. |
| `--danger` | `#ef4444` | Acción/error peligroso. |
| `--danger-strong` | `#e5484d` | Peligro intenso. |
| `--danger-soft` | `#ff6b6b` | Texto de error suave. |
| `--danger-a12` | `rgba(239, 68, 68, 0.12)` | Fondo de peligro. |
| `--danger-a30` | `rgba(239, 68, 68, 0.30)` | Borde de peligro. |
| `--warn` | `#ffbb00` | Advertencia y badge nuevo. |
| `--warn-a15` | `rgba(255, 187, 0, 0.15)` | Fondo de advertencia. |
| `--warn-a40` | `rgba(255, 187, 0, 0.40)` | Borde de advertencia. |
| `--tiktok` | `#fe2c55` | Badge/plataforma TikTok. |
| `--twitch` | `#9146ff` | Badge/plataforma Twitch. |
| `--youtube` | `#ff4444` | Badge/plataforma YouTube. |
| `--kick` | `#53fc18` | Badge/plataforma Kick. |
| `--chat-bg` | `#0f0f0f` | Fondo especializado de chat. |
| `--tiktok-red` | `#2e2e2e` | Alias legado; no usar para nuevo color de marca. |
| `--tiktok-cyan` | `#F0213A` | Alias legado; verde en chat. |
| `--cyan-light` | `rgba(240, 33, 58, 0.05)` | Fondo de acento legado; verde en chat. |
| `--cyan-border` | `rgba(240, 33, 58, 0.2)` | Borde de acento legado; verde en chat. |

`body.high-contrast` y `prefers-contrast: more` reemplazan `--border`, `--border-strong`, `--text-secondary` y `--text-muted`; no fijar esos colores fuera de tokens.

## Radios y espaciado

| Token | Valor | Uso existente |
| --- | --- | --- |
| `--radius-xs` | `6px` | Inputs compactos, previews y botones de prueba. |
| `--radius-sm` | `8px` | Sidebar items, inputs y botones pequeños. |
| `--radius-md`, `--modal-radius` | `12px` | Modales, tablas contenedoras y acordeones; `--modal-radius` es alias histórico. |
| `--radius-lg` | `16px` | Cards, paneles y `.cuenta-card`. |
| `--radius-xl` | `20px` | Disponible para contenedor grande; no hay uso visible en este CSS. |
| `--radius-pill`, `--btn-radius` | `9999px` | Botones pill, tabs, chips y badges; `--btn-radius` es alias histórico. |
| `--card-radius` | `16px` | Radio canónico de tarjeta. |

La escala de espacio sí está definida. Usar estos tokens para gaps, padding y márgenes nuevos: `--space-1` 4px, `--space-1-5` 6px, `--space-2` 8px, `--space-2-5` 10px, `--space-3` 12px, `--space-3-5` 14px, `--space-4` 16px, `--space-4-5` 18px, `--space-5` 20px, `--space-6` 24px, `--space-7` 32px y `--space-8` 40px. En el CSS legacy se repiten especialmente 8/10/12/14/16px para controles y gaps; 18/20/24px para cards y secciones.

La tarjeta canónica también fija `--card-bg: var(--surface)`, `--card-border: 1px solid var(--border)`, `--card-pad: 18px 20px` y `--card-gap: 14px`.

## Tipografía

Fuente UI: `Inter`; para etiquetas técnicas, URLs y tiempo: `Source Code Pro`.

| Token | Valor | Uso existente |
| --- | --- | --- |
| `--text-3xs` | `10px` | Eyebrows, títulos uppercase, badges y metadatos. |
| `--text-2xs` | `11px` | Hints, botones compactos y detalles técnicos. |
| `--text-xs` | `12px` | Labels, botones secundarios y tablas. |
| `--text-sm` | `13px` | Texto secundario, sidebar y controles estándar. |
| `--text-base` | `14px` | Botón base, texto de modal y contenido normal. |
| `--text-md` | `16px` | Tamaño base del body y nombres de perfil/plan. |
| `--text-lg` | `19px` | Títulos de vista y precios. |
| `--text-xl` | `22px` | Título de `.cuenta-card`. |

Los tamaños locales sin token (`15px`, `18px`, `20px`, `36px`) ya existen para inputs/tour, métricas y títulos/temporizador; no crear una escala paralela sin promoverla primero a token.

## Sombras y elevación

| Token o patrón | Valor | Uso |
| --- | --- | --- |
| `--shadow-subtle` | `none` | Alias legado; no añade elevación. |
| `--shadow-1` | `0 4px 14px rgba(0, 0, 0, 0.28)` | Card en reposo y popover pequeño. |
| `--shadow-2`, `--shadow-pop` | `0 12px 30px -6px rgba(0, 0, 0, 0.42)` | Dropdowns, menús y popovers; `--shadow-pop` es alias. |
| `--shadow-3` | `0 24px 48px -16px rgba(0, 0, 0, 0.55)` | Modal u overlay grande. |
| `--shadow-lift` | `0 14px 30px -12px rgba(0, 0, 0, 0.5)` | Elevación en hover de tarjeta. |
| Anillo de foco | `0 0 0 3px var(--brand-a12)` | Focus de inputs. |
| Anillo de estado | `0 0 0 3px var(--brand-a20)` | Punto online; chat usa su variante verde contextual. |

No hay otra sombra hardcodeada repetida como patrón general: las de switch, punto OBS, selección de icono y fila admin son específicas de su componente.

## Movimiento

| Token | Valor | Uso |
| --- | --- | --- |
| `--dur-press` | `130ms` | Press/scale de botones. |
| `--dur-1` | `150ms` | Tooltips, chips y dropdown breve. |
| `--dur-2` | `200ms` | Hovers, toggles y dropdowns. |
| `--dur-3` | `240ms` | Entrada de vista/panel y expansiones. |
| `--dur-4` | `320ms` | Modales y toasts. |
| `--ease-out` | `cubic-bezier(.22, .61, .36, 1)` | Entradas y salidas. |
| `--ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | Movimiento en pantalla. |
| `--ease-overshoot` | `cubic-bezier(.34, 1.56, .64, 1)` | Solo delight. |

Nunca usar `transition: all`: declarar solo las propiedades que cambian. Respetar `prefers-reduced-motion` y `body.reduce-motion`; las animaciones nuevas deben tener una versión reducida equivalente.

## Iconos

- No añadir emoji nuevo a la UI. Usar SVG de `interfaz/publico/icons/`; el catálogo fuente es `asset/icons/` (Material Icons, ~1300 iconos).
- Para un icono normal, conservar `currentColor` y colorearlo desde CSS cuando proceda.
- Si una variante necesita un color concreto, copiar el SVG a `interfaz/publico/icons/` con otro nombre y cambiar `fill`/`stroke` directamente en su XML. Ejemplo existente: `interfaz/publico/icons/flash_on-accent.svg` contiene `fill="#F0213A"`.
- Usar `.icon-inline` para iconos alineados con texto (`1em × 1em`).

## Componentes y patrones existentes

Todas estas clases están definidas en `interfaz/src/estilos/index-legacy.css`.

| Clase | Reusar para |
| --- | --- |
| `.cuenta-card` | Tarjeta de cuenta: superficie, borde, radio grande, padding y entrada. |
| `.cuenta-btn-primary` | CTA primario de cuenta, ancho completo y rojo de marca. |
| `.cuenta-btn-ghost` | Acción secundaria pill; combinar con `.cuenta-btn-danger` para peligro. |
| `.modal-overlay` + `.modal-content` | Modal estándar. Añadir `.show` al overlay para `display: flex` y `fadeIn`. |
| `.sidebar-item` | Navegación principal de sidebar; usar `.active` para selección. |
| `.sidebar-footer-btn` | Acciones/enlaces del pie de sidebar. |
| `.badge-new` | Badge pequeño de novedad, amarillo y animado. |
| `.badge-tiktok`, `.badge-twitch`, `.badge-youtube`, `.badge-kick`, `.badge-admin` | Variantes de badge de plataforma/rol. No existe `.badge-pill`. |
| `.mod-pill` | Estado de moderación; variantes `.clean`, `.muted`, `.banned`, `.follower`. |
| `.mcp-badge` | Badge técnico compacto; variantes `.mcp-badge-danger` y `.mcp-badge-dev`. |
| `.seg-control` + `.seg-btn` | Selector segmentado; marcar la opción con `.active`. |
| `.toggle-chip` | Toggle de texto tipo pill; marcar la opción con `.active`. |

## Botones actuales

| Variante | Propósito/forma | Nota |
| --- | --- | --- |
| `.btn` + `.btn-connect` | Acción primaria pill de conexión. | En Bot/Soundpad se sobreescribe a gris y hover rojo. |
| `.btn` + `.btn-disconnect` | Acción secundaria pill de desconexión. | |
| `.btn-clear` | Acción pill de limpiar; `.channels-connected` cambia a estado conectado/peligro. | |
| `.cfg-btn` | Botón secundario compacto; `.small`, `.icon-only`, `.danger`, `.warn`. | |
| `.mod-tab` | Tab pill de moderación. | No comparte base con `.seg-btn`. |
| `.btn-nav` | Enlace/botón de navegación pill. | |
| `.btn-test` | Acción de prueba con radio pequeño. | |
| `.btn-copy` | Copiar, ancho completo y pill. | |
| `.driver-popover-footer-btn` | CTA del tour Driver.js. | |
| `.btn-supabase-primary` | CTA primario compacto de marca. | Visualmente se solapa con `.cuenta-btn-primary`. |
| `.cuenta-btn-primary` | CTA primario de cuenta. | Visualmente se solapa con `.btn-supabase-primary`, pero es ancho completo. |
| `.cuenta-btn-ghost` | Secundario de cuenta pill. | `.cuenta-btn-danger` es su modificador. |
| `#btn-toggle-add-channel`, `#btn-add-channel` | Botones de añadir canal; gris en reposo, rojo al hover. | Son estilos por ID. |
| `#btnStartStream`, `#btnConnectOBS` | Iniciar stream/conectar OBS; gris en reposo, rojo al hover. | Repiten el tratamiento de añadir canal. |
| `#update-btn-install`, `#update-btn-later` | Acciones del banner de actualización. | Estilo violeta propio del banner. |
| `.ctx-menu button` | Opción de menú contextual. | Patrón local de menú. |
| `.channel-chip button`, `.queue-item-remove`, `.clip-delete`, `.modal-close` | Acciones icon-only locales. | Deben recibir foco visible si se crean nuevas. |

**A unificar a futuro:** `.btn-supabase-primary` y `.cuenta-btn-primary` son dos CTAs rojos muy próximos; `.cfg-btn`, `.btn-nav`, `.btn-clear`, `.mod-tab` y `.cuenta-btn-ghost` son secundarios pill parecidos; los cuatro IDs grises/rojos son el mismo tratamiento visual definido sin clase compartida. Documentar o consolidar solo cuando se toque su flujo, no duplicar otra variante.

## Checklist antes de añadir CSS

- ¿Existe ya un token para color, radio, espacio, sombra, tipografía o duración?
- ¿Existe ya una clase para esta card, botón, modal, sidebar item, badge o selector?
- ¿Un icono puede venir de `interfaz/publico/icons/` en vez de un emoji nuevo?
- ¿Un control clickeable tiene `:focus-visible` perceptible y conserva estado disabled si aplica?
- ¿La transición enumera propiedades explícitas y respeta movimiento reducido?

La fuente de verdad sigue siendo `interfaz/src/estilos/index-legacy.css`. Actualizar este documento si se agregan tokens nuevos.
