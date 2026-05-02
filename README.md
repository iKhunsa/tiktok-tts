# TikTok TTS — Live Chat Text-to-Speech

App de escritorio para streamers de TikTok Live. Lee en voz alta los comentarios del chat en tiempo real, muestra alertas de regalos y seguidores, y provee overlays para OBS/Streamlabs.

## Descarga e instalación

1. Ve a [Releases](https://github.com/iKhunsa/tiktok-tts/releases/latest)
2. Descarga `TikTok-TTS-Setup-x.x.x.exe`
3. Ejecuta el instalador — no requiere Node.js ni admin
4. La app se instala en `%LOCALAPPDATA%\TikTok TTS\`
5. Aparece un acceso directo en el escritorio

## Cómo usar

### Conectar al live
1. Abre la app desde el escritorio
2. Escribe tu usuario de TikTok (sin @)
3. Haz clic en **Conectar**
4. El chat empieza a leerse automáticamente

### Overlays para OBS
Los overlays son URLs que pegas en OBS como **Browser Source**. La app debe estar abierta:

| Overlay | URL |
|---------|-----|
| Alertas (regalos, seguidores) | `http://localhost:3000/overlay-alertas.html` |
| Contador de likes | `http://localhost:3000/overlay-likes.html` |
| Contador de seguidores | `http://localhost:3000/overlay-seguidores.html` |

En OBS: `Fuentes → + → Fuente de navegador → pegar URL`

### Configuración avanzada
Navega a `Ajustes` dentro de la app para:
- Cambiar voz e idioma del TTS (13 idiomas disponibles)
- Ajustar rate limit y cola de mensajes
- Gestionar palabras bloqueadas
- Subir imagen de fondo personalizada para overlays

## Actualizaciones automáticas

La app detecta nuevas versiones al abrirse y te avisa con un diálogo. No necesitas descargar nada manualmente.

## Solución de problemas

**La app no encuentra el live** — verifica que el usuario esté en vivo. Escribe sin @.

**No hay audio** — Google TTS requiere internet. Verifica conexión y volumen del sistema.

**El overlay no carga en OBS** — la app debe estar abierta en segundo plano.

**Al hacer X se cierra** — se minimiza a la bandeja (esquina inferior derecha). Clic derecho → Salir para cerrar.

## Desinstalar

Configuración → Aplicaciones → TikTok TTS → Desinstalar
