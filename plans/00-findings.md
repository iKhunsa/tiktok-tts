# Findings consolidados — pasada visual (motion + polish + color)

Commit base: `945c7b1`. Superficies: `public/index.html`, `public/advanced.html`,
`public/mobile.html`. Overlays fuera de alcance.

## A. Motion — `improve-animations` (audit contra AUDIT.md)

| # | Sev | Categoría | Ubicación | Finding | Fix |
|---|-----|-----------|-----------|---------|-----|
| M1 | HIGH | Perf | `advanced.html:698` | `.toast { transition: all 0.3s }` — anima props fuera de GPU | `transition: transform var(--dur-4) var(--ease-out), opacity var(--dur-4) var(--ease-out)` |
| M2 | HIGH | Perf | `mobile.html:195`, `mobile.html:248` | `transition: all .2s` / `.18s` en `#btnGlobalTTS` y otro | props explícitas (`background`,`color`,`border-color`,`transform`) |
| M3 | HIGH | Interrup + a11y | `index.html:7279-7291` (`showToast`) | toast por `@keyframes slideUp` (no interrumpible), sin cola (se solapan), sin reduced-motion, sin salida | 1 sistema con cola + transición CSS + enter/exit simétrico + gate reduced-motion |
| M4 | MED | a11y | `index.html:1418` `.modal-overlay.show` (`fadeIn`) | no gateado por `prefers-reduced-motion` | envolver en `@media (prefers-reduced-motion: reduce)` → solo opacidad |
| M5 | MED | a11y + perf | `index.html:877` `.chat-msg` (`msgSlideIn`) | anima cada mensaje (alta frecuencia), sin gate | gate reduced-motion → opacidad sola; ok mantener translateY en normal |
| M6 | MED | a11y | `index.html:952` `.wave span` (`waveBar infinite`) | equalizer del chat infinito, sin gate | gate → barras estáticas bajo reduced-motion |
| M7 | MED | Perf + a11y | `index.html:722-744` + `_ttsBarsAnimate()` (~`index.html:5412`) | equalizer del "Live Switch" por `setTimeout(130ms)` animando `height` (layout) en main thread mientras TTS on | animación CSS con `scaleY` + `animation-delay` por barra; borrar el timer JS; gate reduced-motion |
| M8 | MED | a11y | `index.html:509` `.status-dot.online` (`pulse infinite`), `mobile.html:62`, `advanced.html:602` | box-shadow pulsante infinito en 3 archivos, nunca gateado | gate reduced-motion → sin animación (queda el color) |
| M9 | LOW | Perf | `index.html:1504-1525` `.project-card`/`.social-card` | `transition` sobre `flex-grow`/`flex`/`max-height` (layout) en hover; además `ease` en vez de `ease-out` | modal de donaciones, baja frecuencia — aceptable; opcional: `transform`/`opacity` + `ease-out` |
| M10 | MED | Cohesión/tokens | `index.html:407`, `mobile.html:84`, `plugin-store/grid.css:8`, `plugin-store/detail.css:3` (+ ~30 duraciones sueltas) | curva `cubic-bezier(.22,.61,.36,1)` tipeada a mano 4×; duraciones `.12/.15/.2/.24/.3/.4s` sin escala | tokens `--ease-*` / `--dur-*` en cada `:root`, reemplazar literales |
| M11 | LOW | Perf | `index.html:1973` `#update-bar-fill`, `index.html:2730` `#music-progress-bar` | `transition: width` (fuera de GPU) | barras de progreso = excepción (motion constante); dejar |

## B. Motion faltante — `find-animation-opportunities`

| # | Ubicación | Hoy | Propósito | Frecuencia | Motion sugerido |
|---|-----------|-----|-----------|------------|-----------------|
| B1 | `.btn-connect/.btn-disconnect`, `#btnStartStream`, `#btnConnectOBS`, `.btn-test`, CTAs de modal, `.sidebar-item` (`index.html`); `#btnGlobalTTS` (`mobile.html`) | sin `:active` (solo `.sp-card:active` existe, `index.html:261`) | Feedback | Decenas/día | `:active { transform: scale(0.97) }` + `transition: transform var(--dur-press) var(--ease-out)`. Sutil (tier de frecuencia alta). Sin gate hover (es `:active`). Reduced-motion: mantener (es feedback, no desplazamiento). |
| B2 | `.voice-dropdown-menu` `display:none`→`.show` block (`index.html:1831-1835`) | aparece instantánea, sin conexión al trigger | Consistencia espacial + evitar salto | Ocasional | `transform-origin: top; opacity 0 + translateY(-4px) scale(.98)` → asentado, `transition 150ms var(--ease-out)`, vía `@starting-style` o clase. Flecha ya rota (`:1820`). |
| B3 | `.chat-toggles-box.expanded .toggles-row` `display:none`→`flex` (`index.html:604-610`) | el bloque "Ajustar" salta al abrir | Evitar salto + indicar estado | Ocasional | `grid-template-rows: 0fr`→`1fr` + `opacity`, `transition 200ms var(--ease-out)`. Chevron ya rota (`:631`). |
| B4 | `.clips-day-body` `display:none`→`.open` block (`index.html:1895-1896`) | acordeón de días salta abierto | Evitar salto | Ocasional (vista Clips) | mismo patrón `grid-rows`/opacidad, `200ms var(--ease-out)`. |
| B5 | grid de tienda-plugins, filas de moderación, items de playlist | aparecen todas de golpe | Cohesión / evitar salto | Ocasional | stagger 40-60ms por item, tope 6 items (luego instantáneo). Decorativo — nunca bloquea interacción. Solo `opacity`+`translateY(4px)`. |

Salida del toast (simétrica) → ya cubierta en **M3**, no se duplica.

### Rechazados (`find-animation-opportunities`)
- Cambio de vista/tab — **ya anima** (`viewEnter`/`tabEnter`). No falta nada.
- Lista de mensajes del chat — **ya anima** + alta frecuencia. **Rechazado: no agregar más movimiento a algo que se ve constantemente.**
- Selector de idioma (grid del modal, primer arranque) — **Rechazado: raro pero de baja emoción; stagger acá sería wishlist.** El confetti del onboarding ya usa el presupuesto de delight.
- Contadores (seguidores, cola) — **Rechazado: datos funcionales que el usuario lee; no deben moverse por estilo** (y no hay lib de tween de números).
- Barras de progreso (música, update) — **Rechazado: dato funcional; `width` lineal alcanza, motion extra estorba.**

## C. Polish estático — `emil-design-eng` (pendiente)

## D. Estética — `apple-design` (pendiente)

## E. Color — inventario + paleta (pendiente)

## Missed opportunities (aditivas)

| # | Lugar | Hoy | Propuesta |
|---|-------|-----|-----------|
| O1 | Setting `a11yReduceMotion` (`advanced.html`) | solo togglea `body.reduce-motion` en overlays | cablearlo a `index.html`/`advanced.html`/`mobile.html` (clase + CSS) |
| O2 | Toast (`index.html`) | `setTimeout(remove)` → desaparece de golpe | salida simétrica (mismo borde, transición inversa) |
| O3 | Secciones condicionales (chat "Ajustar", dropdown de voz, tabs de moderación) | teletransportan al abrir/cerrar | transición corta de opacidad/altura en las 2-3 grandes |
| O4 | Grid tienda-plugins, filas de moderación, items de playlist | aparecen todas de golpe | stagger 30-80ms en las vistas de baja frecuencia |
| O5 | Conexión de canal exitosa | solo cambia color del status-dot | momento raro de alta emoción sin delight (opcional: check sutil) |

## Rechazados (no tocar)
- `index.html:187` `.ad-slot .ad-layer` 800ms crossfade — ambient, baja atención, YA gateado (`:191`). Correcto.
- `index.html:1334` `.app-glow` 1s opacity — glow ambiental. Correcto.
- `index.html:1779` `fadeIn` usa `scale(0.97)` no `scale(0)`. Correcto.
- `.modal-content` `transform-origin` centrado — modales exentos. Correcto.
- `transition: border-color/background 0.2s` en hovers/focus — `ease` implícito es correcto para color.
