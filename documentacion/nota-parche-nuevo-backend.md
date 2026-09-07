# Nuevo backend

Esta actualización es la más grande hasta ahora. Por dentro, todo el servidor
que corre dentro de la app se reescribió de cero. Por fuera, llega Kick como
cuarta plataforma, un menú lateral que podés armar a tu gusto, el Bot de Música
renovado con playlists de YouTube, avisos automáticos durante el directo y un
montón de huecos de traducción cerrados para que la voz hable siempre en tu
idioma.

## Kick, cuarta plataforma

Hasta ahora la app leía TikTok, Twitch y YouTube. Kick estaba descartado: su
web bloquea cualquier conexión directa desde la app.

Ahora Kick funciona. La app abre una ventana oculta que lee el chat de tu canal
y lo mete en el mismo flujo que las otras tres plataformas. Desde el selector de
plataforma agregás tu canal de Kick igual que cualquier otro.

Lo que llega de Kick:

* Mensajes del chat, con sus emotes.
* TTS: la voz los lee en la misma cola que el resto.
* Moderación: silenciar, banear y todo lo demás de la vista Moderación.
* Badge de plataforma en cada mensaje, filtros en el overlay de chat, control
  móvil.

Lo que **no** llega de Kick: suscripciones, regalos y raids. Es solo chat.

Importante: la conexión con Kick se apoya en un servicio de terceros. Es más
frágil que las otras plataformas; si ese servicio cambia o se cae, el chat de
Kick se corta hasta que se arregle desde la app. El resto de plataformas no se
ve afectado. La app reintenta sola si Kick se queda en silencio.

## Más herramientas: el menú lateral a tu medida

Hasta ahora el menú de la izquierda era fijo: estaban todas las secciones,
siempre, en el mismo orden.

Ahora hay una sección nueva, **Más herramientas**. Adentro hay una vista tipo
tienda con todas las herramientas de la app (Overlays, Bot de Música, Clips,
Soundpad, Control móvil, Moderación), cada una con su imagen de vista previa y
una descripción de para qué sirve.

Desde ahí:

* Mostrás u ocultás cada herramienta del menú lateral.
* Reordenás el menú arrastrando los ítems, estilo Trello.
* Chat y Configuración quedan fijos: no se pueden ocultar ni mover.

En instalaciones nuevas, Clips y Control móvil arrancan ocultos para que el menú
esté más limpio de entrada; se agregan desde acá cuando los necesites. Si ya los
venías usando, siguen donde estaban.

La primera vez que entrás a la sección hay un recorrido guiado que lo explica.

## Bot de Música renovado

La vista del Bot de Música se rediseñó entera: interruptor estilo iOS en vez del
chip de antes, la cola de peticiones y las reglas del bot en dos columnas (una
sola en pantallas angostas), barra de progreso que avanza en tiempo real, un
botón para quitar cada tema de la cola, y ahora se ve cuántas canciones tiene
una playlist.

Además, **soporta enlaces de playlist de YouTube**. Antes solo aceptaba temas
sueltos; ahora si pegás (o alguien pide) una URL de playlist, el bot la expande
y encola todos los temas.

Los comandos `!p` del chat ya no se leen por voz en ninguna plataforma. Antes
podían colarse al TTS.

## Avisos automáticos durante el directo

Se agrega un aviso que suena por la voz TTS invitando a tu audiencia a descargar
la app. Se dispara por tiempo de directo:

* Primer aviso a los 15 minutos de conectar el primer canal.
* Siguiente a la hora de sesión.
* Siguiente a las dos horas.
* De ahí en más, cada 90 minutos.

El contador arranca cuando conectás el primer canal, de cualquier plataforma, y
se corta cuando desconectás todos. Sumar una plataforma a mitad del directo no
reinicia el conteo. Desconectar y volver a conectar cuenta como sesión nueva.

El texto se dice en el idioma de tu voz TTS, no fijo en español.

En la misma línea: el aviso de "el creador acaba de ingresar" ahora es único por
sesión. Antes, si el admin escribía en varias plataformas a la vez, sonaba una
vez por cada una. Ahora suena una sola vez y se reinicia recién al reconectar.

## Que la voz hable siempre en tu idioma

Se cerraron varios huecos donde la app se salteaba su propio sistema de
traducción:

* **Emojis y emotes.** Ahora se pintan como imagen en el chat y se filtran del
  TTS por igual en las cuatro plataformas. Antes Twitch leía en voz alta los
  `:nombre:` de sus emotes.
* **Anuncios de eventos.** Los textos que arma la app para el TTS al detectar un
  regalo, una entrada, un follow, una sub, un cheer, un raid, un like o un share
  estaban escritos fijos en español. Ahora se dicen en el idioma de tu voz.
* **Overlay de alertas de OBS.** Estaba casi todo en español dentro del código;
  ahora traducido a los 10 idiomas de la app.
* **Overlays de likes y seguidores.** El número ahora se formatea según el
  idioma activo, no fijo en formato español.
* **Ventana principal.** Unos 15 textos sueltos que se habían quedado sin
  traducir (avisos, contador de clips, autorización de Twitch, etc.).
* **Errores del servidor.** Los mensajes de error que ves como aviso emergente
  ahora también se traducen.

Los 10 idiomas quedan a la par, con la misma cantidad de textos cada uno.

## Arreglos en la cola de voz

* **Orden real.** La cola ahora se ordena por el momento en que se escribió cada
  mensaje, no por el orden en que llegó a la app. Como los mensajes de chat
  pasan por moderación (con demora variable) y las entradas y regalos no, antes
  un "entró fulano" o tu propio mensaje se podían colar delante de mensajes
  anteriores que todavía estaban en moderación.
* **Retomar al reactivar.** Si apagabas el interruptor global de TTS con
  mensajes pendientes y lo volvías a encender, esos mensajes quedaban atrapados
  y la voz se quedaba muda hasta el siguiente mensaje nuevo. Ahora la cola
  pendiente se retoma al reactivar.

## YouTube ya no se queda mudo en silencio

YouTube a veces deja de mandar mensajes sin dar ningún error: se le vence un
token interno y la app no se entera. Antes el chat de YouTube se quedaba mudo
para siempre, sin aviso.

Ahora hay un vigía: si pasan 4 minutos sin un solo mensaje de YouTube, fuerza la
reconexión automática con los mismos reintentos que ya usaba ante un error. No
toca TikTok, Twitch ni Kick.

## Por dentro: backend reconstruido de cero

Todo el servidor que corre dentro de la app se reescribió, de un archivo
monolítico a 16 partes independientes por área (configuración, idioma,
moderación, canales, chat, overlays, móvil, sonido, bot, clips, telemetría,
avisos, etc.).

* Una parte que falla al arrancar ya no tumba a las demás.
* Se revisó función por función contra el servidor viejo. En el camino
  aparecieron y se arreglaron fallos reales: las acciones de guardado y
  moderación aceptaban pedidos de cualquier origen; el panel de Estado de
  Avanzado no mostraba si había un canal de TikTok conectado; contadores de
  likes de un canal ya desconectado podían disparar un parpadeo fantasma en el
  overlay.
* La configuración se guarda de forma atómica: no se corrompe si se corta la
  luz justo mientras guarda.
* El descargador del Bot de Música ahora se cierra bien en Windows al salir.
* Cada versión pasa por pruebas automáticas y revisión de estilo antes de
  compilarse.

Nada de esto cambia cómo se usa la app.

## Otros cambios

* Animación suave al cambiar de vista, tanto en la ventana principal como en el
  panel móvil y la nueva tienda. Respeta el ajuste de "reducir movimiento".
* Las imágenes de vista previa de las herramientas se optimizaron (de unos 11 MB
  a medio MB en total).
* De acá en adelante, los íconos de la interfaz son gráficos vectoriales, no
  emojis.

## Notas de comportamiento

* 
* El motor de voz y la lógica de conexión a TikTok, Twitch y YouTube no cambian.
  Un mensaje puede dejar de leerse por los mismos motivos que antes (silenciado,
  no seguidor con el filtro apagado, spam, idioma) y por ninguno nuevo.
* Los espectadores de Kick sin identificador estable se moderan por nombre y se
  marcan con ⚠, igual que ya pasaba en las otras plataformas: ese castigo se
  pierde si la persona se cambia el nombre.
* El aviso de autopromoción por voz suena solo, por tiempo de directo, sin
  interruptor para apagarlo.
* Marcar un clip desde el móvil ahora solo guarda el replay en OBS. El marcador
  local de clip en el escritorio ya no se registra en ese caso; antes se
  guardaba por duplicado.
* Las instalaciones nuevas arrancan con Clips y Control móvil ocultos del menú.
