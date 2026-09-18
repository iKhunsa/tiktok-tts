# TikLiveTTS — Live Chat Text-to-Speech

App de escritorio para Windows que lee en voz alta el chat de tus directos en tiempo real. Todo se controla desde la app; añade los overlays a OBS como *Browser Source*.

## Características

- 🔊 **TTS en tiempo real** con un único narrador, cola ordenada por hora de llegada y voces de Google TTS en 13 idiomas y variantes regionales.
- 🌐 **Chat multistream:** conecta TikTok Live, Twitch, YouTube y Kick; cada mensaje conserva el badge de su plataforma.
- 🛡️ **Moderación local de espectadores:** consulta seguidores y participantes, silencia o bloquea usuarios y aplica filtros anti-spam, palabras bloqueadas y filtro de idioma.
- 🎁 **Overlays para OBS:** alertas de regalos, follows y shares; contadores de likes y seguidores; chat, listas sociales y créditos. Personaliza su fondo con tu propia imagen.
- 🎵 **Bot musical** con pedidos desde el chat y playlist, más **Soundpad** con efectos y atajos globales.
- 📱 **Panel móvil:** controla la app a distancia desde el teléfono.
- 🖥️ **PortalView:** navegador integrado con pestañas para abrir y administrar tus herramientas de streaming sin salir de la app.
- ⌨️ **Atajos y OBS:** controla la cola TTS y marca clips en OBS con `Ctrl+Shift+M`.
- 🤖 **Servidor MCP para agentes:** usuarios avanzados pueden conectar Claude Desktop o Claude Code para consultar el stream, moderar y controlar herramientas desde un agente.
- 💳 **Planes opcionales:** Free incluye TTS, chat de una cuenta por plataforma, moderación y overlays; **Sin Promos** elimina los avisos promocionales por US$25/año; **Pro** desbloquea las funciones avanzadas por US$85/año.
- ☕ **Donaciones:** apoya el proyecto mediante Ko-fi o PayPal si te resulta útil.
- 🔄 **Actualizaciones automáticas** desde GitHub Releases.

## Descarga e instalación

1. Ve a [Releases](https://github.com/iKhunsa/tiktok-tts/releases/latest).
2. Descarga `TikLiveTTS-Setup-x.x.x.exe`.
3. Ejecuta el instalador: no requiere Node.js ni permisos de administrador.
4. La app se instala en `%LOCALAPPDATA%\TikLiveTTS\` y crea accesos directos en el escritorio y el menú Inicio.

> ⚠️ El instalador no está firmado, por lo que Windows Defender puede mostrar un aviso la primera vez. Haz clic en **Más información → Ejecutar de todas formas**.

## Cómo usar

1. Abre la app e inicia sesión o usa el plan Free.
2. Añade tu canal de TikTok, Twitch, YouTube o Kick y pulsa **Conectar**. Para YouTube, el canal debe estar en directo.
3. Ajusta la voz, idioma y filtros desde **Ajustes**; el chat empezará a leerse al conectarse.
4. Si usas OBS, copia la URL del overlay deseado desde la sección **Overlays** y pégala como **Fuente de navegador**. Mantén la app abierta mientras transmites.

### Overlays para OBS

| Overlay | URL |
| --- | --- |
| Alertas de regalos | `http://localhost:3000/overlay-alertas.html` |
| Contador de likes | `http://localhost:3000/overlay-likes.html` |
| Contador de seguidores | `http://localhost:3000/overlay-seguidores.html` |
| Follows y shares | `http://localhost:3000/overlay-social.html` |
| Créditos | `http://localhost:3000/overlay-creditos.html` |
| Chat unificado | `http://localhost:3000/overlay-chat.html` |

En OBS: `Fuentes → + → Fuente de navegador → pegar URL`.

## Actualizaciones automáticas

La app busca actualizaciones al abrirse y las descarga en segundo plano. Cuando estén listas, podrás instalarlas sin reiniciar el PC. Consulta los cambios en [CHANGELOG.md](CHANGELOG.md).

## Solución de problemas

**La app no encuentra el live** — verifica que el canal esté en directo y prueba el usuario sin `@`.

**No hay audio** — Google TTS requiere internet; revisa tu conexión y el volumen del sistema.

**El overlay no carga en OBS** — deja la app abierta, incluso si está minimizada.

**El chat de YouTube no aparece** — el canal debe estar transmitiendo en vivo.

**Al cerrar la ventana no se cierra la app** — se minimiza a la bandeja del sistema. Haz clic derecho en el icono y elige **Salir**.

## Desinstalar

Configuración de Windows → Aplicaciones → TikLiveTTS → Desinstalar.

## Contribuir

¿Quieres aportar? Revisa los [issues abiertos](https://github.com/iKhunsa/tiktok-tts/issues) y la [guía de contribución](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE)
