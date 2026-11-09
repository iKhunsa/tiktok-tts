## TikLiveTTS 1.12.0

La actualización más grande desde la 1.11.2. Se renovó por completo el sistema de cuentas, se armó un catálogo nuevo de overlays con editor propio, se rediseñó Moderación y ahora vos decidís cuándo y cómo se actualiza la app.

### Novedades

**Nuevo inicio de sesión y registro**
- Pantalla de acceso rediseñada, con imagen de fondo y textos nuevos.
- **Iniciar sesión**: entra con Google en un clic o elige «Correo electrónico» para usar email y contraseña en la misma tarjeta.
- **Crear cuenta**: el registro es solo con Google y pide un nickname único, tu nombre de creador, que nadie más puede usar.
- **Recuperar contraseña**: si olvidaste tu clave, te llega un correo con un enlace para elegir una nueva, sin tener que escribirle a soporte.

**Nueva ventana «Mi cuenta»**
- Al hacer clic en tu correo o en «Mi cuenta» desde el menú de cuenta, se abre una ventana propia con menú lateral, en lugar de cambiar de pantalla.
- **Perfil**: cambia tu foto y tu banner (ahora se suben de verdad, con vista previa mientras cargan), edita tu nickname con un clic, vincula Google, cierra sesión o elimina tu cuenta desde un solo lugar.
- **Vincular cuentas**: conecta tu Twitch y tu Kick además de tu TikTok, todo desde la misma pantalla. Antes solo se podía usar TikTok para chat y alertas; vinculando Twitch/Kick también les llegan tus alertas de regalos y nuevos seguidores en esas plataformas.
- **Facturación**: tu plan con la fecha de renovación, tu método de pago, el historial de facturas con descarga en PDF y la opción de cancelar el plan — ahora con datos reales de tu cuenta, ya no es una pantalla de ejemplo.
- **Accesibilidad**: tamaño del texto (Normal, Medio, Grande, Muy grande), reducir movimiento en los overlays, TTS de voz lenta y alto contraste. Los cambios se aplican al instante.
- **Ayuda** abre directamente nuestro Discord.
- La ventana se adapta al tamaño de la app, crece al maximizarla y no tapa los botones de la ventana.

**Catálogo de overlays, de punta a punta**
- Toda la sección de Overlays se rearmó como un catálogo navegable por categorías (Chat, Seguidores, Regalos, Suscripciones, Interacciones, Audiencia, Música, Resumen del stream), en vez de una lista larga y plana.
- Cada overlay tiene su propia tarjeta con vista previa en vivo, botón de prueba y sus ajustes de personalización a mano, sin tener que andar copiando URLs a ciegas.
- **Editor con lienzo**: armá tu propia escena arrastrando overlays sobre un lienzo del tamaño de tu fuente de OBS, reordenando capas y ajustando cada uno a mano. Una sola URL para toda la composición, en vez de agregar overlay por overlay en OBS.
- **Skins** por overlay y recursos propios por plataforma (logos, colores) para que cada tarjeta se vea distinta según de dónde viene el evento.
- **Overlay de música**: muestra en OBS la canción que está sonando y quién la pidió.
- Overlays nuevos de evento y contador, pensados para sumarse al lienzo sin ocupar tanto espacio como los overlays completos.
- **Donaciones y seguidores de Twitch y Kick**: las alertas de regalo y de nuevo seguidor ahora también se disparan con eventos reales de Twitch y Kick (antes solo reaccionaban a TikTok), para quienes tengan esas cuentas vinculadas.
- **Overlay de teclado y mouse**: un overlay nuevo que muestra en vivo qué teclas (WASD y alrededores) y botones del mouse estás presionando, con tema oscuro o claro, color de acento y opacidad configurables desde el mismo panel que el resto de los overlays.
- **Sonidos de alerta y capas GIF**: sumá un sonido propio o un GIF a cualquier alerta, elegidos desde tu biblioteca de Mis sonidos / Mis GIFs.

**Moderación rediseñada**
- El gate de regalos (silenciar el chat hasta recibir una donación) ahora se basa en el monto donado, no solo en seguir el canal — el viejo gate de "solo seguidores" quedaba corto porque cualquiera podía seguir gratis y saltárselo.
- **Rust Chat Guard** (el motor de moderación por IA) se movió de Ajustes avanzados a un panel propio dentro de Moderación, junto al resto de las herramientas de chat.
- La vista de Moderación se repintó de punta a punta para que todo —mute/ban, chat guard, gate de regalos, palabras bloqueadas— viva en el mismo lugar.

**Control de voz más fino**
- Velocidad y tono de la voz del TTS ahora son dos controles independientes (antes el tono venía atado a la velocidad), para ajustar el sonido de tu voz sin tener que resignar lectura rápida o lenta.
- Volumen de los anuncios (el audio que suena antes del mensaje, si lo tenés activado) configurable aparte del volumen general de la voz.

**Actualizaciones a tu manera**
- Elegís el canal de actualización (estable o beta) desde la propia app, en vez de que la app decida sola.
- **Rollback**: si una versión te trae un problema, podés volver a una anterior desde la misma pantalla de actualizaciones.
- El flujo de actualizar cambió por completo: ahora hay un modal propio de la app que te avisa que hay una versión nueva, te deja confirmar si querés descargarla (con barra de progreso y botón de cancelar) y recién instala cuando vos decís. Antes se abría sola una ventana del instalador de Windows y, si la cerrabas sin querer, la app quedaba cerrada sin volver a abrirse.

### Otros cambios
- Los ajustes de accesibilidad salen de Ajustes avanzados y pasan a **Mi cuenta → Accesibilidad**.
- El idioma de la interfaz se movió a Preferencias, junto al resto de los ajustes generales.
- El botón de refrescar de la barra de título y el logo del costado ahora hacen una recarga completa de la ventana, no solo del contenido.
- Nuevo banner de TikTok e ilustración nueva en el costado de la app.

### Arreglos
- Tu sesión se mantiene sincronizada entre ventanas: si te desloguea algo (token vencido, cambio de cuenta), ya no quedan pantallas mostrando datos de una sesión que ya no existe.
- Se corrigió un caso donde el TTS podía quedarse colgado leyendo un mensaje y no arrancar con el siguiente.
- Al guardar cambios en el perfil ya no se perdían datos como tu foto, tu banner o si tenés contraseña configurada.
- Arreglado el parámetro que faltaba al iniciar sesión con Kick, que en algunos casos impedía vincular la cuenta.
- El modal de eliminar cuenta y el panel de voz quedaron con sus controles y textos revisados de punta a punta.
