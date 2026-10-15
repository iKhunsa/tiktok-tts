# Changelog

Todas las novedades relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [1.11.2] — 2026-10-09

### Moderación del chat
- Nuevo motor **Rust Chat Guard**, encendido de fábrica en modo observación (no bloquea, solo registra qué habría filtrado).
- Nuevo bloque **«Moderación del chat»** en Ajustes: nivel, idiomas, palabras permitidas, palabras bloqueadas y estado del motor.
- Los idiomas del filtro **siguen al idioma de la voz** del TTS automáticamente.
- Popup de **mensajes bloqueados** desde el badge de la cola (bloqueados, palabras y cola TTS).
- Gestión de palabras bloqueadas unificada y **guardada por cuenta** (se migra sola desde el formato anterior).
- El filtro respeta los veredictos del guard y las acciones de moderación se guardan al instante.
- Nuevo filtro de **texto sin sentido** (teclazos al azar como «asdfghjkl;»): si alguien manda varios seguidos, el mensaje se ve en el chat pero no se lee. Viene activo de fábrica y puedes cambiarlo en Ajustes > «Moderación del chat» a «Solo avisar» o «Apagado». Nunca silencia a la persona: eso lo decides tú. Los mensajes con palabras reales, risas (`jajaja`, `wkwkwk`, `ㅋㅋㅋ`), emotes o enlaces no se marcan.
- En el popup de mensajes bloqueados, los de texto sin sentido llevan un botón **«Silenciar usuario»** por si quieres cortar al spammer.
- **Importar palabras bloqueadas** desde un archivo `.json`, con un asistente de 3 pasos: «Formato» (ejemplo listo para copiar), «Importar» (arrastra o elige el archivo) y «Confirmar» (cuántas son nuevas y una vista previa). Las palabras se suman a tu lista actual, no la reemplazan.

### Overlays de OBS
- Nuevo **overlay de espectadores de TikTok** con personalización, vista previa y botón de prueba.
- Chat, Top Likers y **Top Donadores** con ajustes completos desde «Personalizar»; avatares, roles (moderador/suscriptor) y anillo con burbuja de plataforma en el avatar.
- **Vista previa con datos de ejemplo** sin necesidad de estar conectado (chat con las 4 plataformas, alertas fijas).
- Alertas de Follow/Share simplificadas y color de acento en Top Likers. Se retira el fondo personalizado.

### Canales
- **TikTok con sesión persistente por cuenta**: login/logout dentro de «Agregar canal», aviso de sesión caducada y tutorial que explica el login.
- Reconexión mucho más estable: recupera ante cambio de sala, vigila con doble señal para no reconectar lives silenciosos y reintenta Twitch y YouTube tras silencios.
- Los reintentos de conexión de los canales se conservan entre intentos.
- Carga más rápida al arrancar (el cliente de TikTok se carga solo cuando se usa).

### Cuenta y planes
- Botón **Eliminar cuenta** en el perfil, con contraseña y confirmación escribiendo la palabra.
- Toggle **mensual / anual** y cambio de intervalo desde la cuenta; el popup de planes y el checkout abren en mensual.
- Banner de upgrade a Pro bajo la barra «Se lee» (solo plan Free), banner rotativo en el chat y modal de código de descuento.
- Modales de **donaciones** y de **cancelación de Pro** rediseñados; videos demo de las funciones Pro; **Clips** pasa a ser función Pro con su demo.
- El botón de mejorar plan abre la comparación de planes; el popup ya no aparece al iniciar.
- Paywall del panel móvil y panel móvil con badge Pro y menú de cuenta.

### Legal y privacidad
- **Términos y Política de Privacidad v2.1** (con traducción al inglés).
- El instalador pide aceptarlos en cada instalación y actualización; sin aceptarlos no se inicia telemetría, analítica ni reporte de errores.
- Se informan los términos al registrarse.

### Interfaz
- **Voz y audio** rediseñado en 3 tarjetas, adaptable al ancho de la ventana.
- **Atajos de teclado en pestañas**: TTS y chat, Música y General.
- Íconos SVG en lugar de símbolos en Ajustes, feedback al pulsar y Canales con estilos unificados.
- Efectos de evento y aviso de conexión fallida.
- Novedades con video de YouTube embebido.
- Conexión del agente **MCP** simplificada (snippets más claros).
- Ahora puedes cerrar la ventana sin apagar la app. Si activas **Minimizar a la bandeja al cerrar** en Ajustes, al pulsar la X TikLiveTTS se esconde en la bandeja del sistema (junto al reloj) y sigue leyendo el chat. Para cerrarla del todo, haz clic derecho en su ícono y elige **Salir**. Viene desactivado, así que la X sigue cerrando la app como antes hasta que lo actives.
- Nueva opción **Abrir al iniciar Windows**: TikLiveTTS arranca solo al encender el PC, así ya está listo cuando empiezas tu directo.

### Correcciones
- Badge de la cola con texto claro y repintado al cargar el idioma.
- El banner de Pro vuelve a verse en cada apertura.
- Textos corruptos (mojibake) reparados en los 10 idiomas y claves nuevas traducidas.
- Tutorial de canales apuntaba a un elemento oculto; el login de TikTok no desaparecía al iniciar sesión.
- Chips de plataforma del chat overlay mostraban mal su estado marcado.
- Sidebar por defecto en instalación nueva (chat, overlays, clips, moderación).
- Soundpad valida mejor la lista recibida; mensaje de chat simulado con id único.
- TTS: se corta el audio que se queda colgado y se limita el largo del texto.
- Se respeta `--user-data-dir` cuando se indica explícitamente.
- Varios ajustes de iconos, modales y estados en la interfaz.
- Importar palabras bloqueadas ya no acepta archivos con formato inválido: un JSON roto o que no sea una lista de palabras se rechaza con un aviso claro, en vez de dar un error genérico o llenar la lista de texto basura.
- Avisos de voz de TikLiveTTS más inteligentes: el primero suena a los 15 minutos y los siguientes, como mucho cada 25 minutos y solo cuando hay gente en tu directo. Si el directo está vacío, esperan a que llegue audiencia en vez de sonar igual. Antes podían repetirse muy seguido o tardar muchísimo en sonar. Con el plan Pro no suenan.
- La voz ya no lee los números largos de los nicks: `pablito434435433453` se lee «pablito», y las cuentas sin nombre propio (`user14423423…`, `usuario14423423…`) se leen como «usuario», en el idioma de la app. Vale para el chat y para los avisos de entradas, follows, regalos, likes y shares. Los nombres con pocos números (`lu15`, `pablo2024`) se leen igual que antes, y en pantalla, OBS y rankings el nick se sigue viendo completo.
- Bot de música: pedir una canción con un link de YouTube (`!p https://youtu.be/...`) vuelve a poner esa canción. Antes el link se perdía y el bot buscaba la palabra «link», así que sonaba otra canción. En el chat y en la voz el link se sigue mostrando como «link».
- Bot de música: el motor de YouTube ahora recibe los arreglos el mismo día que salen, en vez de esperar semanas a la siguiente versión estable. Así los pedidos dejan de fallar mucho antes cuando YouTube cambia algo. Si una actualización del motor quedaba a medias porque había música sonando, se termina de aplicar sola al volver a abrir la app.
- Kick: el chat vuelve a conectar. Kick cambió el sistema que usa para su chat en vivo y la app ya no podía leerlo: fallaba al conectar. Ahora usa el sistema nuevo de Kick, sigue sin pedir cuenta ni login, y la conexión se mantiene sola durante todo el directo.

### Videos de YouTube
- [Ver video de novedades](https://www.youtube.com/watch?v=TNSqxGlOCyE)

## [1.9.3] — 2026-09-14 (prerelease)

### Cambiado
- **Experimento de continuidad de TikTok** (`@tiklivetts/tiktok-live-client@0.1.5`):
  ante un cuerpo vacío de `room/enter/` (el único caso "sin info" real, sin
  ningún dato — a diferencia de un `status_code` o un JSON inválido, que sí
  traen algo), la ventana invisible ahora se revela 10 segundos (silenciada)
  antes de cerrarse, en vez de destruirse al instante. Coincide con el
  reintento interno ya existente (hasta 3 intentos). Hipótesis a comprobar:
  el throttling de una ventana en segundo plano podría ser parte de por qué
  la firma/anti-bot de TikTok a veces no completa a tiempo — verificado
  manualmente que funciona en una corrida real, sigue en observación.

## [1.9.2] — 2026-09-14 (prerelease)

### Arreglado
- **Falsos "el usuario no está en vivo"**: el paquete (`@tiklivetts/tiktok-live-client@0.1.4`)
  ya no convierte un cuerpo vacío, un JSON inválido, una estructura
  inesperada o un código de error de TikTok (ej. `status_code: 4003110`, sin
  `data.status`) en un offline confirmado. Esos casos ahora se distinguen
  como "no pudimos comprobar el estado" — la app muestra "No pudimos
  comprobar si el usuario está en vivo. Intentá nuevamente" en vez de
  afirmar (incorrectamente) que el directo no está en vivo.

### Agregado
- **Continuidad de conexión de TikTok**: al pulsar "Conectar", el canal se
  mantiene intentando conectar y recuperándose solo — ráfaga rápida de
  reintentos al principio, después backoff espaciado sin límite — hasta que
  el usuario pulsa "Desconectar". Un corte técnico o un estado ambiguo ya no
  borra el canal ni obliga a volver a conectar a mano. Mensajes nuevos y
  calmados: "Conectando con TikTok…", "Restaurando conexión con TikTok…",
  "Conexión con TikTok restablecida.", "Este canal no está en vivo.
  Esperaremos su próximo live." — nunca un error técnico por cada intento.
- El watchdog de conexión muda ya no depende solo del chat: cualquier señal
  técnica (regalos, likes, follows, o el conteo de viewers que TikTok empuja
  igual con la sala en silencio) cuenta como "conexión viva", así que un
  directo silencioso ya no se trata como caído.

### Conocido
- Sigue sin identificarse la causa raíz de por qué la comprobación de
  `room/enter/` falla de forma intermitente (firma, sesión, o carga del
  proceso principal siguen siendo hipótesis, ninguna confirmada) — esta
  versión hace que la app la tolere automáticamente, no la elimina.

## [1.9.1] — 2026-09-13 (prerelease)

### Cambiado
- **Dominio TikTok reescrito** (`features/canales/tiktok/`): mismo
  comportamiento que la versión anterior — debounce de combos de regalo,
  watchdog de socket mudo (5 min), timeout anti-cuelgue de 30s al conectar,
  backoff exponencial con tope de reintentos — sobre código nuevo y más
  simple. Se unificó el teardown de conexión, antes duplicado en las 3 rutas
  de desconexión (`disconnect`, `remove-channel`, `platforms-disconnect`) y
  en el shutdown de `canales/`, para que todas reusen un único `teardownConn`.
- **Cliente propio de TikTok Live** (`@tiklivetts/tiktok-live-client`, sin
  depender de Eulerstream) verificado en vivo end-to-end: conecta, recibe
  chat/regalos/likes/follows/joins/shares, y se reconecta sola ante un corte.

### Conocido
- La conexión a TikTok puede fallar de forma puntual y no determinista
  (`Network.getResponseBody` vuelve vacío bajo carga del proceso, ya
  documentado como limitación conocida del propio cliente) — reintentar
  conectar la resuelve. No es un bug de la app ni depende de en qué carpeta
  viva la app; se auditó a fondo antes de descartarlo como tal.

## [1.8.12] — 2026-09-12

### Cambiado
- **Conexión a TikTok Live** reemplaza `tiktok-live-connector` (dependía de
  Eulerstream, un servicio de firma anti-bot de pago) por
  `@tiklivetts/tiktok-live-client`, cliente propio que resuelve la firma
  localmente con una ventana de Electron invisible. Sin cambios para el
  usuario final; misma UX de conexión y chat.

### Arreglado
- Detección de canal de TikTok sin transmitir en vivo, y de fin de directo,
  sin depender de un servicio externo.

## [1.6.0] — 2026-08-07

### Añadido
- Módulo de **telemetría** (`telemetry/`): uso agregado y anónimo hacia un
  servicio propio self-hosted (repo `telemetria-tts`, Docker), desactivado
  por completo si no hay `TELEMETRY_URL` configurada. Conectores para app,
  creadores, plataformas, contadores de alta frecuencia (TTS/música/
  moderación), OBS, panel móvil, overlays, updates y errores.
- Reporte de bugs con logging de sesión y onboarding guiado.

## [1.5.8] — 2026-07-25

### Añadido
- **Toggle "Leer monto del regalo"**: permite desactivar el anuncio por voz del equivalente en dólares de los regalos de TikTok, sin apagar el anuncio de regalos completo. Activado por defecto (sin cambio de comportamiento salvo que se desactive manualmente). El badge visual `≈ $X USD` en el chat sigue mostrándose siempre. No afecta bits de Twitch ni YouTube.
- **Sección "Accesibilidad"** en Configuración Avanzada:
  - Reducir movimiento: apaga animaciones en los 7 overlays de OBS (excepto el scroll de créditos, que solo se hace más lento).
  - Tamaño de texto y botones: 4 niveles de escala para ventana principal, configuración y overlay de chat.
  - Alto contraste: refuerza bordes y texto secundario.
  - TTS de voz lenta.
  - Indicador de plataforma por letra (T/W/Y) además de color, para usuarios daltónicos.
  - Todos los ajustes sincronizan en vivo por WebSocket sin recargar OBS; overlays con `?size=`/`?speed=` manual en la URL mantienen ese valor.

### Arreglado
- **Issue #14 — TTS forzaba "Usuario dice: comentario"** sin opción de desactivarlo. Ahora existe un toggle independiente "Decir 'dice'" junto a "Decir nombre". La palabra conectora se localiza según la voz TTS activa (says/diz/dit/sagt/etc. en los 13 idiomas soportados) en vez de estar fija en español.
- **UX de Configuración**: la vista ya no dispara conexiones. Se eliminó el panel "Conexión principal" (atajo legacy solo-TikTok); "Canales adicionales" pasa a llamarse "Canales vinculados" y su botón ahora solo "Guardar" (vincula sin conectar). Conectar de verdad ocurre únicamente desde "Conectar todo" en la vista Chat.

## [1.5.5] — 2026-07-17

### Arreglado
- Modal de idiomas permitidos aparecía vacío cuando la voz era la legacy `es`.

## [1.5.4] — 2026-07-16

### Arreglado
- **Conexión con Twitch.** El botón "Conectar Twitch" no hacía nada o daba error al autorizar. Se reemplazó por completo el método de conexión por un flujo de código de dispositivo (Device Code Flow): clic en **Conectar Twitch** → se abre una página oficial de Twitch con un código ya cargado → **Activar** y **Autorizar**. La app se conecta sola y renueva la sesión automáticamente, sin copiar tokens.
- Fix en el filtro de palabras bloqueadas.

### Añadido
- Filtro de idioma por diccionario: los mensajes en idiomas no deseados se descartan antes del TTS.

### Quitado
- Se eliminó la vinculación con cuenta de Google para alertas de YouTube (membresías y superchats por OAuth), que daba problemas y casi no se usaba. El chat de YouTube sigue funcionando igual.

## [1.5.3] — 2026-07-15

### Añadido
- Badge "Nuevo" junto al botón Donar.

## [1.5.2] — 2026-07-15

### Añadido
- Donaciones vía Ko-fi y PayPal.
- Aviso one-time tras actualizar.

## [1.5.1] — 2026-07-13

### Arreglado
- El TTS pausa y reanuda desde el mismo punto en vez de saltarse el mensaje.

## [1.5.0] — 2026-07-13

### Añadido
- Motor del **bot de música** (song requests).
- Herramientas de precios de regalos.

## [1.4.0] — 2026-06-28

### Añadido
- **Internacionalización completa (i18n):** interfaz traducida a 10 idiomas (es, en, pt, fr, de, it, ja, zh, ru, ko).
- Dos atajos de teclado para la cola TTS: saltar mensaje y limpiar cola.

## [1.3.0] — 2026-06-26

### Añadido
- Infraestructura de **bot de música** y **soundpad** (deshabilitadas inicialmente hasta pulir).

## [1.2.13] — 2026-06-09

### Añadido
- **Control remoto móvil (Beta):** maneja la app desde el teléfono, con el escritorio como fuente de verdad.

## [1.2.12] — 2026-06-08

### Cambiado
- Actualización de `tiktok-live-connector` de 1.2.3 a 2.1.0.

## [1.2.11] — 2026-05-31

### Seguridad
- Pasada de endurecimiento de seguridad y estabilidad (múltiples fixes: reconexión OBS con backoff exponencial, control móvil, validación de rangos de emotes, base de followers por canal, rate limiter compartido, cola TTS FIFO, colores de usuario deterministas, entre otros).

## [1.2.10] — 2026-05-18

### Añadido
- Overlay de chat unificado.
- TikTok vía la API de plataformas.
- Auto-reconexión de Twitch/YouTube.

## [1.2.8] — 2026-05-18

### Cambiado
- Rediseño de UI y fixes de seguridad.

## [1.2.6] — 2026-05-18

### Añadido
- Multi-canal.
- Imágenes de regalos en el overlay.

### Arreglado
- Traducción del TTS.

## [1.2.0] — 2026-05-14

### Añadido
- Traducción de mensajes, emotes, valor en USD de regalos, pausa de TTS.
- Detección de stream en OBS.
- Overlays de follow/share.

## [1.1.0] — 2026-05-07

### Arreglado
- Atajo global `Ctrl+Shift+M` (marcar clip en OBS).

## [1.0.2] — 2026-05-06

### Añadido
- Chat de Twitch y YouTube, badge de plataforma en cada mensaje.
- Cola TTS ordenada por timestamp (lectura cronológica entre plataformas).

### Quitado
- Soporte de Kick (bloqueado por Cloudflare; ver `AGENTS.md`).

## [1.0.0] — 2026-05-02

### Añadido
- Primera versión empaquetada: migración a **Electron** (app de escritorio, sin navegador externo).
- Overlays para OBS, lista de palabras bloqueadas.
- Auto-update vía GitHub Releases y CI con GitHub Actions.

[1.6.0]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.6.0
[1.5.5]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.5.5
[1.5.4]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.5.4
[1.5.3]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.5.3
[1.5.2]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.5.2
[1.5.1]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.5.1
[1.5.0]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.5.0
[1.4.0]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.4.0
[1.3.0]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.3.0
[1.2.13]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.2.13
[1.2.12]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.2.12
[1.2.11]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.2.11
[1.2.10]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.2.10
[1.2.8]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.2.8
[1.2.6]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.2.6
[1.2.0]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.2.0
[1.1.0]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.1.0
[1.0.2]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.0.2
[1.0.0]: https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.0.0
