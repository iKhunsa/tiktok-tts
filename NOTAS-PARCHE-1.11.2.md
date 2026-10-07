## TikLiveTTS 1.11.2

Actualización grande (todo lo hecho desde la 1.10.0). Si algo falla, usa **Reportar Bug** en el menú lateral.

### Novedades

**Moderación del chat**
- Nuevo motor **Rust Chat Guard**, encendido de fábrica en modo observación (no bloquea, solo registra qué habría filtrado).
- Nuevo bloque **«Moderación del chat»** en Ajustes: nivel, idiomas, palabras permitidas, palabras bloqueadas y estado del motor.
- Los idiomas del filtro **siguen al idioma de la voz** del TTS automáticamente.
- Popup de **mensajes bloqueados** desde el badge de la cola (bloqueados, palabras y cola TTS).
- Gestión de palabras bloqueadas unificada y **guardada por cuenta** (se migra sola desde el formato anterior).
- El filtro respeta los veredictos del guard y las acciones de moderación se guardan al instante.
- Nuevo filtro de **texto sin sentido** (teclazos al azar como «asdfghjkl;»): si alguien manda varios seguidos, el mensaje se ve en el chat pero no se lee. Viene activo de fábrica y puedes cambiarlo en Ajustes > «Moderación del chat» a «Solo avisar» o «Apagado». Nunca silencia a la persona: eso lo decides tú. Los mensajes con palabras reales, risas (`jajaja`, `wkwkwk`, `ㅋㅋㅋ`), emotes o enlaces no se marcan.
- En el popup de mensajes bloqueados, los de texto sin sentido llevan un botón **«Silenciar usuario»** por si quieres cortar al spammer.

**Overlays de OBS**
- Nuevo **overlay de espectadores de TikTok** con personalización, vista previa y botón de prueba.
- Chat, Top Likers y **Top Donadores** con ajustes completos desde «Personalizar»; avatares, roles (moderador/suscriptor) y anillo con burbuja de plataforma en el avatar.
- **Vista previa con datos de ejemplo** sin necesidad de estar conectado (chat con las 4 plataformas, alertas fijas).
- Alertas de Follow/Share simplificadas y color de acento en Top Likers. Se retira el fondo personalizado.

**Canales**
- **TikTok con sesión persistente por cuenta**: login/logout dentro de «Agregar canal», aviso de sesión caducada y tutorial que explica el login.
- Reconexión mucho más estable: recupera ante cambio de sala, vigila con doble señal para no reconectar lives silenciosos y reintenta Twitch y YouTube tras silencios.
- Los reintentos de conexión de los canales se conservan entre intentos.
- Carga más rápida al arrancar (el cliente de TikTok se carga solo cuando se usa).

**Cuenta y planes**
- Botón **Eliminar cuenta** en el perfil, con contraseña y confirmación escribiendo la palabra.
- Toggle **mensual / anual** y cambio de intervalo desde la cuenta; el popup de planes y el checkout abren en mensual.
- Banner de upgrade a Pro bajo la barra «Se lee» (solo plan Free), banner rotativo en el chat y modal de código de descuento.
- Modales de **donaciones** y de **cancelación de Pro** rediseñados; videos demo de las funciones Pro; **Clips** pasa a ser función Pro con su demo.
- El botón de mejorar plan abre la comparación de planes; el popup ya no aparece al iniciar.
- Paywall del panel móvil y panel móvil con badge Pro y menú de cuenta.

**Legal y privacidad**
- **Términos y Política de Privacidad v2.1** (con traducción al inglés).
- El instalador pide aceptarlos en cada instalación y actualización; sin aceptarlos no se inicia telemetría, analítica ni reporte de errores.
- Se informan los términos al registrarse.

**Interfaz**
- **Voz y audio** rediseñado en 3 tarjetas, adaptable al ancho de la ventana.
- **Atajos de teclado en pestañas**: TTS y chat, Música y General.
- Íconos SVG en lugar de símbolos en Ajustes, feedback al pulsar y Canales con estilos unificados.
- Efectos de evento y aviso de conexión fallida.
- Novedades con video de YouTube embebido.
- Conexión del agente **MCP** simplificada (snippets más claros).

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
- Avisos de voz de TikLiveTTS más inteligentes: el primero suena a los 15 minutos y los siguientes, como mucho cada 25 minutos y solo cuando hay gente en tu directo. Si el directo está vacío, esperan a que llegue audiencia en vez de sonar igual. Antes podían repetirse muy seguido o tardar muchísimo en sonar. Con el plan Pro no suenan.

### Interno
- Analítica de producto y telemetría anónima más completas (sin nicks, IDs ni texto del chat); firma de lotes de telemetría y reporte de errores con más contexto.
- Dependencias: `@tiklivetts/chat-guard` 0.2.0, `@tiklivetts/rust-chat-guard` 0.2.0, `@tiklivetts/tiktok-live-client` 0.1.9.

---

## TikLiveTTS 1.11.2 — English summary

Big update since 1.10.0: the new **Rust Chat Guard** moderation engine (observe mode by default) with a dedicated settings block and a blocked-messages popup, a **nonsense-text filter** that stops reading keyboard-mashing spam (on by default, never mutes anyone on its own), a **TikTok viewers overlay** plus fully customizable chat / top likers / top donors overlays with live-less previews, **persistent TikTok login per account** with much more stable reconnection, **Delete account**, monthly/yearly plans, redesigned donation and cancellation modals, **Terms & Privacy v2.1** accepted on every install/update, a redesigned **Voice & audio** view with tabbed keyboard shortcuts, smarter promo announcements (spaced at least 25 minutes apart and only when your live has an audience), and many fixes.
