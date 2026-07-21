# Guía de contribución — TikTok TTS

¡Gracias por querer aportar! Esta guía explica cómo levantar el proyecto y cómo enviar cambios.

## Requisitos

- [Node.js](https://nodejs.org/) 18+ y npm
- Windows (la app se empaqueta para Windows; el desarrollo también funciona en otros SO para la parte de servidor)
- Git

## Poner en marcha el proyecto

```bash
git clone https://github.com/iKhunsa/tiktok-tts.git
cd tiktok-tts
npm install
```

### Modos de ejecución

| Comando | Qué hace |
|---------|----------|
| `npm run electron` | Abre la app completa en modo desarrollo (Electron + servidor + UI). **Es el modo recomendado.** |
| `npm run dev` | Levanta solo el servidor Node.js con recarga (`node --watch server.js`), sin la ventana de Electron. Útil para trabajar en backend/overlays desde el navegador. |
| `npm start` | Solo el servidor, sin recarga. |

Con el servidor activo, la UI está en `http://localhost:3000` y los overlays en `http://localhost:3000/overlay-*.html`.

## Estructura del proyecto

```
main.js        → Proceso principal de Electron (ventana, tray, auto-update)
server.js      → Express + WebSocket: conexiones (TikTok/Twitch/YouTube), TTS, API
public/        → UI y overlays (HTML/CSS/JS)
  index.html     → UI principal
  advanced.html  → Configuración avanzada (filtros, palabras bloqueadas)
  overlay-*.html → Overlays para OBS
  locales/       → Traducciones (i18n)
gifts/         → PNGs de regalos de TikTok
```

Hay más contexto técnico en [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md).

## Cómo trabajar un cambio

1. Crea una rama desde `main`: `git checkout -b feat/mi-cambio`
2. Haz tus cambios y pruébalos (ver tabla de arriba).
3. Si agregas texto visible en la UI/overlays, agrega su clave en `public/locales/*.json`.
4. Abre un Pull Request contra `main` usando la plantilla.

### Convención de commits

El historial usa [Conventional Commits](https://www.conventionalcommits.org/) con la versión entre paréntesis:

```
feat(v1.6.0): descripción corta del cambio
fix(v1.5.6): descripción del arreglo
chore(v1.5.7): tarea de mantenimiento
```

## Flujo de release (mantenedores)

1. Subir la versión en `package.json`.
2. Actualizar `CHANGELOG.md`.
3. `git tag vX.Y.Z && git push origin main --tags`
4. GitHub Actions compila el instalador NSIS y lo sube como *draft* a Releases.
5. Publicar con `gh release edit vX.Y.Z --draft=false`.

## Reportar bugs o proponer ideas

Usa las plantillas de issue. Para dudas de uso abiertas, usa Discusiones.

¡Gracias por contribuir! 💜
