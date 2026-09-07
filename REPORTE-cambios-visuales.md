# Qué cambié — en palabras simples

Trabajé sobre 3 pantallas: **la app principal** (`index.html`), **Configuración
avanzada** (`advanced.html`) y **el control del celular** (`mobile.html`).
Todo está **en tu compu, sin guardar en git todavía**. Si algo no te gusta se
revierte entero con un comando (abajo del todo).

La idea de fondo: antes cada botón, cada color y cada animación estaban puestos
"a mano" en cada lugar. Ahora hay una **lista central** de colores y de
tiempos/curvas de animación, y las piezas tiran de esa lista. Se ve **igual que
antes**; lo que cambia es que ahora es ordenado y coherente.

---

## Cambios que SÍ vas a notar

### 1. Los avisos (toasts) ahora hacen fila
- **Antes:** si salían 2 o 3 avisos juntos, se pisaban unos con otros.
- **Ahora:** se apilan uno arriba del otro (máximo 3), entran subiendo y salen
  bajando por el mismo lado. Los de error duran un poco más y son rojos; los de
  "guardado" son verdes.
- **Cómo revisarlo:** en la app, hacé algo que dispare varios avisos seguidos
  (copiar un link de overlay, conectar/desconectar, subir un sonido). Fijate que
  no se superpongan.

### 2. Los botones "responden" al tocarlos
- **Antes:** varios botones no daban ninguna señal al hacer clic.
- **Ahora:** el botón se achica un pelín mientras lo mantenés apretado (muy
  sutil). Aplica a: menú lateral, botones Conectar/Desconectar, "Probar",
  botones principales, y en el celular el botón grande de TTS y los chips.
- **Cómo revisarlo:** hacé clic sostenido en el menú lateral o en "Probar voz" y
  mirá el mini "hundido".

### 3. El desplegable de voz se abre con transición
- **Antes:** la lista de idiomas aparecía de golpe.
- **Ahora:** se despliega suave desde arriba (donde está el botón).
- **Cómo revisarlo:** Configuración → "Voz" → clic en el selector de idioma.

### 4. El ecualizador del "Live Switch" (las barritas rojas del interruptor TTS)
- **Antes:** lo movía un temporizador de JavaScript (gasta CPU aunque la ventana
  esté de fondo).
- **Ahora:** lo mueve el navegador solo, con animación pura de CSS. Se ve casi
  igual, va más liviano.
- **Cómo revisarlo:** en Chat, prendé el interruptor TTS (arriba a la izquierda
  de la fila de botones) y mirá las barritas.

### 5. "Reducir movimiento" ahora también afecta la app
- **Antes:** el setting de Avanzado → "Reducir movimiento" solo apagaba
  animaciones en los overlays de OBS.
- **Ahora:** si tu sistema operativo tiene activado "reducir movimiento", o si
  prendés ese setting, la app principal también baja las animaciones (los
  avisos, los modales, el latido de los puntitos de estado, los ecualizadores)
  — se quedan quietos pero siguen apareciendo.
- **Cómo revisarlo:** Windows → Configuración → Accesibilidad → Efectos
  visuales → apagá "Efectos de animación". Recargá la app: los puntitos de
  estado dejan de latir, los avisos aparecen sin deslizarse.

---

## Cambios que NO se ven (limpieza interna)

- Se creó la lista central de **colores** (superficies, bordes, texto, estados
  ok/error/aviso, colores de cada plataforma, sombras) en las 3 pantallas.
- Se arreglaron tokens de color con **nombre mentiroso** (había un `--green`
  que en realidad valía rojo).
- Se creó la lista central de **tiempos y curvas** de animación.
- Se sacó `transition: all` (una mala práctica que anima cosas de más) de 3
  lugares.
- El aviso de la app usaba un color llamado `--tiktok-red` que en realidad era
  gris oscuro: se renombró a `--toast-bg` (mismo color, nombre honesto).

---

## Segunda tanda (ya aplicada)

### 6. Colores a la lista central — a fondo
- **Antes:** ~350 colores escritos a mano en la app principal.
- **Ahora:** ~105 reemplazados por la lista central (rojo de marca + sus
  transparencias, grises de fondo/borde, tintes de hover, velos negros, colores
  de texto, estados, plataformas). En Avanzado y Móvil también.
- Quedan ~88 literales **a propósito**: son colores de un solo componente (el
  rojo puntual del interruptor TTS), stops de degradado, y sub-paletas propias
  (el gris del cartel de actualización, el violeta de Discord). Meterlos a la
  lista sería inventar 100 nombres sueltos — peor que dejarlos. También quedan
  los colores por defecto de los overlays (`#FFBB00` en los selectores de
  color): eso es **dato que vos editás**, no color del tema.
- **Cómo revisarlo:** recorré todas las pantallas. Tiene que verse **idéntico**
  a antes — el objetivo era ordenar, no recolorear.

### 7. Las 2 secciones que "saltaban" ahora abren suave
- El panel **"Ajustar"** del chat (los 10 chips de "qué se lee") y el
  **acordeón de días** en Clips: antes aparecían de golpe, ahora se despliegan.
- **Cómo revisarlo:** Chat → botón "Ajustar" (abajo a la derecha de la fila de
  chips). Y en Clips, tocá el encabezado de un día.

### 8. Escalas de tamaño/espaciado (solo preparadas)
- Se dejó definida una lista de tamaños de texto, espaciados y redondeos en la
  app principal, **sin aplicarla todavía** (cero cambio visual). Es la base para
  una pasada de estética fina más adelante — esa sí necesita hacerse mirando
  pantalla por pantalla, no a ciegas.

## Tercera tanda (ya aplicada)

### 9. Sombras unificadas
- **Antes:** ~15 sombras escritas a mano, todas un poco distintas.
- **Ahora:** 3 niveles de sombra (card / menú / modal) + 1 de hover. Los que
  usaban valores casi iguales ahora comparten el nivel. Cambio muy sutil.

### 10. Redondeos a la lista central
- 54 `border-radius` pasados a tokens (`--radius-sm/md/lg/...`), **mismo valor
  exacto** — cero cambio visual, solo orden.

### 11. Tipografía más nítida (Apple)
- Se activó "optical sizing" y mejor suavizado de fuente en las 3 pantallas.
  Inter se ve un pelín más limpia a todos los tamaños.

### 12. Más accesibilidad automática
- Si tu sistema tiene "reducir transparencia", los modales y el desplegable
  pasan a fondo sólido (sin blur).
- Si tu sistema tiene "más contraste", la app sube bordes y texto sola (lo mismo
  que el toggle manual de Avanzado, pero automático).

### 13. Entrada escalonada en la Tienda de Plugins
- Las tarjetas de la tienda entran una tras otra (40ms de diferencia, tope 6).
- **En Moderación NO** se hizo: ahí puede haber cientos de filas y escalonar
  cientos de cosas se sentiría lento.
- **Cómo revisarlo:** menú → Tienda de Plugins → mirá las tarjetas al entrar.

## Cuarta tanda (ya aplicada)

### 14. Tarjetas unificadas
- Las tarjetas de contenido (**Configuración** y **Tienda de Plugins**) ahora
  comparten fondo, borde, redondeo y espaciado. Antes cada una tenía valores un
  poco distintos.
- El fondo de las tarjetas de Configuración quedó **un pelín más claro** que la
  página (antes era igual y solo el borde las separaba) — se distinguen mejor.
- Las tarjetas con imagen (grilla de Overlays/Bot, modal de donaciones) se
  alinearon entre sí (mismo redondeo).
- Las fichas de Sonidos (los cuadraditos de colores) y las filas de listas **no
  se tocaron** — son otra cosa, no tarjetas.
- **Cómo revisarlo:** entrá a Configuración y a Tienda de Plugins. Las tarjetas
  se ven consistentes entre sí.

### 15. Botón "primary" arreglado
- **Antes:** fondo rojo, y al pasar el mouse se ponía **verde** (bug). Texto
  negro sobre rojo (se leía mal).
- **Ahora:** fondo rojo, hover rojo más oscuro, texto blanco.
- **Cómo revisarlo:** botones tipo "Guardar playlist" / "Agregar canal" — pasá
  el mouse.

### 16. Escalas de tamaño aplicadas (parcial)
- Los tamaños de texto de la app ahora tiran de una lista central (mismo valor,
  solo orden). Los títulos de cada sección tienen el interlineado ajustado
  (más ceñido, estilo Apple).
- **Falta:** apretar todos los espaciados a una grilla estricta de 8px. Eso
  mueve decenas de valores y hay que revisarlo pantalla por pantalla — no se
  hace a ciegas.

## Lo que queda para otra tanda

- Apretar el espaciado a grilla estricta (revisión visual iterativa).
- Los overlays de OBS (7 archivos) quedaron fuera de alcance.
- Test en `npm run electron` + "reducir movimiento" del sistema operativo real.

Detalle técnico completo: `plans/README.md` y `plans/00-findings.md`.
Las 3 variantes del aviso que probé: abrí `plans/prototype-toast.html` en un
navegador.

---

## Si querés volver todo atrás

```bash
git checkout -- public/
```

Eso borra **todos** estos cambios visuales y deja las 3 pantallas como estaban.
(Las skills nuevas en `.claude/` y `plans/` no se tocan con eso.)

## Si querés quedarte con esto

Decímelo y lo commiteo. También conviene que corras vos
**`/review-animations`** sobre el diff — es la revisión oficial de animaciones y
solo la podés lanzar vos (yo no puedo invocarla).
