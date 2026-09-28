# Reconexion persistente de canales

Twitch solo encadenaba reintentos desde `disconnected`: si `connect()` fallaba durante un reintento, registraba el error y terminaba. El limite de cinco intentos tambien abandonaba cortes largos.

La reconexion ahora agenda el siguiente intento tanto tras una desconexion como tras un fallo de reconexion. Usa 1, 2, 4, 8 y 16 segundos, y luego 30 segundos mientras el canal siga deseado. Retirar o desconectar el canal cancela el timer y evita que un intento en vuelo lo restaure. Una conexion exitosa reinicia el backoff.

YouTube y Kick tenian el mismo abandono en el `catch` del reintento y el mismo limite. Reciben la misma politica mediante `features/canales/reconnect-delay.js`, sin acoplar sus conexiones.

Se anadieron pruebas de Twitch para un corte superior a dos minutos, retirada durante el corte y reinicio del backoff. Se ejecutaron build del frontend, la suite `node --test`, chequeo MCP y ESLint.

| Archivo | Reglas/smells aplicados |
| --- | --- |
| `features/canales/reconnect-delay.js` | F1, G17, G20, G25: una funcion pura compartida y un unico limite nombrado. |
| `features/canales/{twitch,youtube,kick}/connect-*.js` | G3, G5, G17, G20, G28, G30: cubre el fallo de reintento y centraliza la programacion por plataforma. |
| `features/canales/state/channel-maps.js` | G22, G35: la intencion de reconectar es estado explicito del dominio. |
| `features/canales/routes/{remove-channel,platforms-disconnect}.js` | G5, G17, G30: reutiliza la desconexion que tambien cancela reintentos. |
| `test/canales-twitch-connect.test.js` | T1, T3, G3: prueba corte largo, cancelacion y reinicio de backoff. |
