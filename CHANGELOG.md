# Changelog

Todas las novedades relevantes de este proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

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
- Backend de telemetría.

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
