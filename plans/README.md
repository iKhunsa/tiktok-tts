# Pasada visual — estado

Commit base: `945c7b1`. Todo aplicado en **local, sin commits**.
Diff: `git diff public/` (index.html, advanced.html, mobile.html).

## Aplicado (este run)

| Familia | Qué se hizo | Archivos |
|---------|-------------|----------|
| Tokens de movimiento | `--ease-out/-in-out/-overshoot` + `--dur-press/-1/-2/-3/-4` en los 3 `:root` (valores = curvas ya en uso) | index, advanced, mobile |
| Tokens de color | capa semántica: `--surface-1/2/3`, `--hover-1/2/3`, `--scrim`, `--ok/--danger/--warn`, `--tiktok/--twitch/--youtube/--kick`, `--shadow-1/2/pop`, `--brand`, `--toast-bg`; arreglados los tokens con nombre mentiroso (`--green` valía rojo) | index, advanced, mobile |
| Reducir movimiento | `@media (prefers-reduced-motion)` + `body.reduce-motion` cablean a la UI principal (antes solo overlays). Gatea toasts, modales, chat-msg, status-dot, equalizers, badges. `applyA11yConfig` togglea `body.reduce-motion` | index, mobile |
| `transition: all` (M1/M2) | reemplazado por props explícitas + tokens en `.toast` (advanced), `#btnGlobalTTS` y `.m-chip` (mobile) | advanced, mobile |
| Sistema de toasts (M3/O2) | 1 sola función con cola (máx 3), apilado, entrada/salida simétricas por transición CSS, gate reduced-motion. Reemplaza el `@keyframes slideUp` y elimina el solapamiento | index |
| Equalizer "Live Switch" (M7) | `setTimeout(130ms)` que animaba `height` en el hilo principal → animación CSS `@keyframes ttsEq` con `scaleY` (GPU), delays por barra. `_ttsBarsAnimate` ahora es no-op | index |
| Press feedback (B1) | `:active { transform: scale(.97~.98) }` + transición en `.sidebar-item`, `.btn-connect/-disconnect`, `.btn-test`, `.btn-supabase-primary`, `#btnGlobalTTS`, `.m-chip` | index, mobile |
| Dropdown de voz (B2) | `display:none`→`block` (teletransporte) → transición opacidad+`scale` desde `transform-origin: top`, con `visibility`/`pointer-events`; gate reduced-motion | index |
| Radio de modal | `.modal-content` usa `var(--modal-radius)` (antes literal `12px`; el token existía sin usarse) | index |
| Curvas a token | `viewEnter`/`tabEnter` usan `var(--dur-3) var(--ease-out)` | index, mobile |

Prototipo de toasts (3 variantes + selector): `plans/prototype-toast.html`.
Se promovió la variante A (stack, abajo-centro, sube/baja).

## Segunda tanda (aplicada)

| Familia | Qué se hizo |
|---------|-------------|
| Color — consolidación profunda | ~85 reemplazos en `index.html` (`<style>`) + 17 en `advanced.html` + 3 en `mobile.html`. Familias: rojo de marca + sus 8 alphas, grises de superficie/borde, tintes blancos de hover (5 niveles), velos negros, texto (`--text-bright` ×10), estados ok/danger/warn, plataformas, `#2C2C2C`→`--surface-raised`, `#1c1c1c`→`--surface-speaking`, etc. Tokens con nombre mentiroso arreglados también en advanced (`--tiktok-red`→`var(--border)`, `--orange`/`--yellow`→tokens de texto). |
| B3 — panel "Ajustar" del chat | `display:none`→`flex` (salto) → transición `max-height`+`opacity`+`padding`, gate reduced-motion. Chevron ya rotaba. |
| B4 — acordeón de Clips | `display:none`→`block` (salto) → misma transición `max-height`+`opacity`+`padding`, gate reduced-motion. |
| Escalas | `--radius-* --space-* --text-*` definidas en `index.html :root` para adopción gradual (sin aplicar aún — cambio visual nulo). `--modal-radius`/`--btn-radius` documentados como alias de `--radius-md`/`--radius-pill`. |

## Pendiente (follow-up)

| # | Item | Por qué |
|---|------|---------|
| C2 | ~88 literales restantes en `index.html` `<style>` | son component-specific (rojo `#e63946` del tts-switch), stops de gradiente (morados twitch `#7c3aed`/`#a78bfa`), sub-paletas propias (slate `#94a3b8`/`#64748b` del update banner, discord `#9382ff`), y decorativos de un solo uso. Forzarlos a tokens = 100+ tokens hiper-específicos (peor que un sistema) o cambiar valores (regresión). **Se dejan como literales a propósito.** |
| C3 | Literales en `style="..."` inline del markup (~90 en index) y defaults JS (`value="#FFBB00"`, arrays de confetti) | son **datos** (colores por defecto de overlays que el usuario edita) o están en JS que necesita hex real, no CSS var. No son styling de tema. |
| B5 | Stagger 40-60ms en grid tienda-plugins / filas de moderación | decorativo, toca JS de render |
| M9 | `.project-card`/`.social-card` animan layout en hover (modal donaciones) | baja frecuencia, aceptable |
| Polish estético | aplicar `--space-*`/`--text-*` para ritmo de espaciado/tipografía; unificar los ~6 estilos de card; `.btn-supabase-primary` tiene hover verde sobre fondo rojo | necesita revisión visual iterativa, no un pase a ciegas |

## Tercera tanda (aplicada)

| Familia | Qué se hizo |
|---------|-------------|
| Sombras | escala de elevación unificada `--shadow-1/2/3` + `--shadow-lift`. 9 `box-shadow` hand-typed casi-iguales → tokens (refinamiento sutil, no idéntico). |
| Radio | 54 `border-radius` exact-match → `--radius-xs/sm/md/lg/xl/pill` (valor idéntico, cambio visual nulo). |
| Tipografía (apple-design) | `font-optical-sizing: auto` + `-moz-osx-font-smoothing: grayscale` + `text-rendering: optimizeLegibility` en los 3 `body`. Inter renderiza mejor a todos los tamaños. |
| A11y (apple-design) | `@media (prefers-reduced-transparency: reduce)` → modal/dropdown sólidos sin blur. `@media (prefers-contrast: more)` → espeja `body.high-contrast` desde el SO. |
| B5 — stagger | `plugin-store/grid.css`: entrada escalonada de `.store-card` (40ms/item, tope 6, luego 260ms), gate reduced-motion + `body.reduce-motion`. **Filas de moderación: rechazado** (dato funcional, cientos de filas — no debe escalonar). |
| detail.css | CTA de la tienda: literales `#363636`/`#898989`/`#F0213A` → tokens + press feedback (`:active scale .97`). |
| grid.css | badges de estado → tokens (`--ok`, `--hover-2`, `--warn`). El amarillo "pinned" pasa de `#ffcc00` a `--warn` (`#ffbb00`) — imperceptible, unifica el amarillo. |

## Autoevaluación contra los 10 estándares de `review-animations`

| # | Estándar | Estado |
|---|----------|--------|
| 1 | Motion justificado | ✅ toast (evitar salto), equalizer (estado), press (feedback), dropdown/accordions (espacial), stagger (cohesión, ≤6 items) |
| 2 | Apropiado a la frecuencia | ✅ press sutil (.97, 130ms); nada nuevo en acciones de teclado o de +100/día |
| 3 | Easing responsivo | ✅ todo `var(--ease-out)`; cero `ease-in` (solo `ease-in-out` para movimiento) |
| 4 | Sub-300ms en UI | ✅ press 130, dropdown 150, accordions 240, toast 320 (tier modal/toast permite hasta 500) |
| 5 | Origen y físico | ✅ dropdown `transform-origin: top`; toast desde el borde; equalizer `scaleY` desde centro; sin `scale(0)` (mín .28/.97/.98) |
| 6 | Interrumpible | ✅ toast = transiciones CSS (no keyframes); dropdown/accordions = transiciones |
| 7 | Solo GPU | ✅ toast transform/opacity; equalizer `scaleY` (antes `height`); press transform; sacado `transition:all` ×3 |
| 8 | Accesibilidad | ✅ `@media (prefers-reduced-motion)` + `body.reduce-motion` en todo lo animado; `prefers-reduced-transparency` + `prefers-contrast` nuevos |
| 9 | Enter/exit asimétrico | ✅ toast enter 320 / exit ~360; el resto son estados, no aplica |
| 10 | Cohesión / tokens | ✅ todo referencia `--ease-*`/`--dur-*`/`--shadow-*`; ~160 literales de color a tokens |

**Veredicto propio: Approve.** Correr **`/review-animations`** sobre
`git diff public/` para el veredicto oficial (no lo puedo invocar yo).

## Cuarta tanda (aplicada)

| Familia | Qué se hizo |
|---------|-------------|
| Tarjetas — unificación | **Content-cards** (`.cfg-card`, `.store-card`) → tokens `--card-bg/-border/-radius/-pad/-gap` (bg unificado a `--surface`, radio a 16, pad a `18px 20px`). **Media-cards** (`.social-card`, `.project-card`) → radio alineado a `--radius-xl` (20), borde a `--divider`. **Tiles** (`.sp-card` coloreada, `.queue-item` fila de lista) → **sin tocar** (son componentes distintos, no tarjetas). |
| `.btn-supabase-primary` | hover verde `#2fbf7e` sobre fondo rojo → `var(--brand-hover)` (#d81830, rojo oscuro). Texto `#0a0a0a` (negro sobre rojo, contraste pobre) → `#fff`. **Cambio visual intencional — arregla el bug.** |
| Escalas | `--space-*` (base 4 + medios pasos) y `--text-*` (10–22) expandidas para cubrir los valores reales del layout. 95 `font-size` exact-match → tokens (valor idéntico). `.view-header` a ritmo: `mb 22→24`, `line-height` 1.25 en h2 (leading ajustado, apple-design), 1.5 en p. |

**Pendiente real de ritmo:** apretar el espaciado a menos pasos (8pt estricto)
cambia decenas de valores y necesita revisión visual pantalla por pantalla — no
se hace a ciegas. Las escalas quedan listas y adoptadas donde el valor coincide.
