# Telemetry — Deploy con Portainer

## Pasos en Portainer

1. **Stacks → Add Stack**
2. Elegir **Repository**
3. Llenar:

| Campo | Valor |
|-------|-------|
| Repository URL | `https://github.com/iKhunsa/tiktok-tts` |
| Repository reference | `refs/heads/main` |
| Compose path | `docker/docker-compose.yml` |

4. Bajar a **Environment variables** y agregar:

| Variable | Valor |
|----------|-------|
| `ADMIN_TOKEN` | tu token secreto (ej: `abc123xyz`) |
| `POSTGRES_PASSWORD` | password segura para la DB |
| `PORT` | `4000` (o el que quieras) |

5. Click **Deploy the stack**

## URLs después del deploy

- **Dashboard:** `http://tu-servidor:4000`
- **Endpoint telemetría (app):** `http://tu-servidor:4000/api/ping`
- **Health check:** `http://tu-servidor:4000/health`

## Antes del primer release de la app

Edita `main.js` línea 9:
```js
const TELEMETRY_URL = 'https://TU_SERVIDOR_AQUI/api/ping';
```
Cambia `TU_SERVIDOR_AQUI` por la IP o dominio real de tu servidor.

## Actualizar el stack

En Portainer → tu stack → **Pull and redeploy**. Portainer re-clona desde GitHub y rebuild automático.
