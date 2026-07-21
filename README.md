# TikTok TTS — Live Chat Text-to-Speech

App de escritorio (Windows) que lee en voz alta el chat de tus directos en tiempo real. Pensada para streamers que quieren TTS integrado sin depender de herramientas externas: la interfaz corre dentro de la app y los overlays se pegan en OBS como *Browser Source*.

Multi-plataforma: **TikTok Live**, **Twitch** y **YouTube** a la vez, con la cola de voz ordenada cronológicamente entre las tres.

## Características

- 🔊 **TTS en tiempo real** del chat, con un solo narrador y cola serializada.
- 🌐 **Multi-plataforma:** TikTok Live + Twitch + Youtube simultáneos; badge de plataforma en cada mensaje.
- 🕒 **Cola ordenada por timestamp:** los mensajes de las 3 plataformas se leen en el orden real en que se escribieron.
- 🗣️ **Voces TTS en varios idiomas** (Google Translate TTS): es, en, pt, fr, de, it, ja, zh, ru, ko y variantes regionales.
- 🌍 **Interfaz traducida a 10 idiomas.**
- 🎁 **Alertas de regalos, seguidores y shares** como overlays para OBS.
- 🎵 **Bot de música / song requests** desde el chat.
- 🔉 **Soundpad** para efectos de sonido.
- 📱 **Control remoto móvil (Beta):** maneja la app desde el teléfono.
- 🧹 **Filtros:** anti-spam, palabras bloqueadas y filtro de idioma por diccionario.
- ⌨️ **Atajos de teclado:** saltar/limpiar cola TTS y `Ctrl+Shift+M` para marcar clip en OBS.
- 🖼️ **Fondo personalizable** para overlays.
- ☕ **Donaciones** integradas (Ko-fi / PayPal).
- 🔄 **Auto-actualización** vía GitHub Releases.

## Descarga e instalación

1. Ve a [Releases](https://github.com/iKhunsa/tiktok-tts/releases/latest)
2. Descarga `TikTok-TTS-Setup-x.x.x.exe`
3. Ejecuta el instalador — no requiere Node.js ni admin
4. La app se instala en `%LOCALAPPDATA%\TikTok TTS\`
5. Aparece un acceso directo en el escritorio

> ⚠️ El instalador no está firmado, así que Windows Defender puede mostrar un aviso en la primera instalación. Clic en **Más información → Ejecutar de todas formas**.

## Cómo usar

### Conectar al live
1. Abre la app desde el escritorio
2. Escribe tu usuario de TikTok (sin @)
3. Haz clic en **Conectar**
4. El chat empieza a leerse automáticamente

Para **Twitch** y **YouTube**, usa la sección de plataformas/canales dentro de la app. El chat de YouTube requiere que el canal esté en vivo. Para anunciar seguidores de Twitch con su nombre, conecta tu cuenta desde **Configuración → Conectar Twitch** (se abre una página oficial de Twitch con un código; solo tocas Activar y Autorizar).

### Overlays para OBS
Los overlays son URLs que pegas en OBS como **Browser Source**. La app debe estar abierta:

| Overlay | URL |
|---------|-----|
| Alertas de regalos | `http://localhost:3000/overlay-alertas.html` |
| Alertas de follow/share | `http://localhost:3000/overlay-alertas-social.html` |
| Contador de likes | `http://localhost:3000/overlay-likes.html` |
| Contador de seguidores | `http://localhost:3000/overlay-seguidores.html` |
| Follows + shares (listas) | `http://localhost:3000/overlay-social.html` |
| Créditos ("Gracias") | `http://localhost:3000/overlay-creditos.html` |
| Chat unificado | `http://localhost:3000/overlay-chat.html` |

En OBS: `Fuentes → + → Fuente de navegador → pegar URL`. Varios overlays aceptan parámetros por URL (p. ej. `?color=`, `?bg=`, `?goal=`).

### Configuración avanzada
Navega a `Ajustes` dentro de la app para:
- Cambiar voz e idioma del TTS
- Ajustar rate limit y cola de mensajes
- Gestionar palabras bloqueadas y el filtro de idioma
- Subir imagen de fondo personalizada para overlays

## Actualizaciones automáticas

La app detecta nuevas versiones al abrirse y te avisa con un diálogo. No necesitas descargar nada manualmente. El historial de cambios está en [CHANGELOG.md](CHANGELOG.md).

## Solución de problemas

**La app no encuentra el live** — verifica que el usuario esté en vivo. Escribe sin @.

**No hay audio** — Google TTS requiere internet. Verifica conexión y volumen del sistema.

**El overlay no carga en OBS** — la app debe estar abierta en segundo plano.

**El chat de YouTube no aparece** — el canal debe estar transmitiendo en vivo.

**Al hacer X se cierra** — se minimiza a la bandeja (esquina inferior derecha). Clic derecho → Salir para cerrar.

## Desinstalar

Configuración → Aplicaciones → TikTok TTS → Desinstalar

## Contribuir

¿Quieres aportar? Revisa los [issues abiertos](https://github.com/iKhunsa/tiktok-tts/issues) (hay varios marcados como `good first issue`) y lee la [guía de contribución](CONTRIBUTING.md).

Para desarrollo local:

```bash
git clone https://github.com/iKhunsa/tiktok-tts.git
cd tiktok-tts
npm install
npm run electron   # app completa en modo desarrollo
# o
npm run dev        # solo el servidor Node.js (sin ventana Electron)
```

## Licencia

[MIT](LICENSE)
