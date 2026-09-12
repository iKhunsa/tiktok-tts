# Auditoria TikTok — Work Tree GPT Astra

## Resultado

El bloqueo principal estaba en el arranque de la sesion anonima del paquete,
antes de llegar al TTS. Tambien habia errores en el ciclo de conexion de la
app y en la conversion de likes. Se corrigieron ambos repositorios en ramas
de pruebas, sin modificar sus ramas de origen.

La version original 0.1.3, contra `emilions27` activo, recibio dos HTTP 403 y
un HTTP 200 vacio; termino con `NOT_LIVE` y cero eventos. Destruia la ventana
tras cada respuesta vacia, sin dejar completar la inicializacion de sesion.
Con el parche y una sesion anonima nueva, el mismo live paso a devolver una
sala online y eventos webcast; tres chats atravesaron servidor, interfaz,
Google TTS y reproduccion completa de audio.

`X-Bogus=1` aparecio tanto en fallos como en conexiones validas. Por si solo
no demuestra una firma invalida. La diferencia observada fue el arranque de
sesion/cookies y conservar la ventana entre reintentos. No se reutilizo la
cuenta personal del streamer, ni se uso Euler, ni un proceso Electron hijo.

## Aislamiento y commits

| Repositorio | Base | Rama de pruebas | Directorio |
| --- | --- | --- | --- |
| App | `Dev-2-nuevo-backend`, `c76f377` | `codex/work-tree-gpt-astra` | `C:\Users\liber\OneDrive\Documentos\Work Tree GPT Astra` |
| Paquete | `main`, `1869ee9` | `codex/work-tree-gpt-astra` | `C:\Users\liber\OneDrive\Documentos\TikTok Live Client GPT Astra` |

Commit local del paquete: `33ada5226670f78f9fc063ff7f36d43b66682ca5`.
Las dependencias existentes se reutilizaron mediante junctions de Windows;
el paquete de la app apunta al worktree del paquete para estas pruebas.
No se editaron los `node_modules` de los directorios originales.

La rama de la app se sube al remoto. El paquete queda con commit local, sin
publicacion, siguiendo la ultima indicacion del usuario. El lockfile de la
app conserva la version publicada 0.1.3: clonar esta rama sin enlazar el
paquete corregido NO incluye el arreglo de sesion. Para distribuirlo falta
publicar una nueva version del paquete y actualizar el lockfile de la app.

## Correcciones

### Paquete

- Conservar ventana y sesion durante hasta dos recargas, separadas por 5 s,
  bajo un limite total de 25 s; no reiniciar la sesion en cada cuerpo vacio.
- Exigir sala online y un primer mensaje webcast decodificado para resolver
  `connect()`. El mensaje puede ser viewer count; no exige que alguien escriba.
- Separar HTTP/JSON/API fallidos (`SIGNING_FAILED`) de un estado explicitamente
  offline (`NOT_LIVE`). Manejar tambien cuerpos CDP en base64.
- Escuchar solo el WebSocket de webcast y reportar su cierre, incluso cuando
  la ventana sigue abierta. Ignorar otros WebSockets de la pagina.
- Cancelar y limpiar ventanas, listeners, promesas y timers al fallar,
  desconectar o reemplazar la conexion.

### App

- Rechazar la promesa que espera HTTP al vencer el timeout de 30 s, tanto
  en conexion inicial como en reconexion.
- No devolver exito cuando un evento `error` elimina la entrada pendiente.
- Aplicar teardown completo en desconexion, eliminacion de canal y shutdown,
  incluidos los timers de combos de regalos.
- No permitir que una conexion obsoleta modifique la nueva.
- Convertir `likeCount` del protobuf de string a numero antes de sumarlo:
  `'2'` y `'3'` producen 5, no una concatenacion.
- Rearmar el watchdog con cualquier evento, incluido viewer count; un live
  activo sin comentarios no necesita reconectarse cada cinco minutos.
- Un error aislado de decodificacion no cancela una conexion que aun arranca.

## Evidencia y limites

| Verificacion | Resultado |
| --- | --- |
| App, `npm test` | 154 pruebas aprobadas |
| Paquete, `npm test` | 9 pruebas aprobadas, incluidas capturas protobuf reales |
| App, `npm run build:front` | Build y verificacion de assets correctos |
| App, `npm run lint` | Sin errores; avisos existentes en el proyecto |
| Original 0.1.3, live activo, perfil nuevo | Cero eventos; falso `NOT_LIVE` tras respuestas vacias |
| Parche, servidor Express real + renderer Electron, perfil nuevo | 3 chats recibidos, 3 audios HTTP 200, 3 reproducciones terminadas, 0 errores de reproduccion |
| Capturas reproducidas a traves de la API publica del paquete y la app | Chat, entrada, like, regalo, follow, share y aviso de administrador: 7 audios HTTP 200 y 7 reproducciones terminadas |

El replay sustituye solo el transporte externo con las capturas del paquete;
mantiene decoder, mapeo publico, adaptador de canales, dominios del servidor,
WebSocket local, interfaz, generacion Google TTS y reproduccion reales.
La ventana de pruebas esta silenciada para no interferir con el streamer;
se observaron los eventos reales de inicio y final de reproduccion.

Los anuncios de regalos, entradas, likes, follows y shares vienen apagados
por defecto en los ajustes de lectura. Para el replay se activaron en el
perfil temporal. Recibir el evento y anunciarlo son pasos independientes.
`sonido:hablar` es un gancho del bus; quien solicita `/api/tts` y reproduce
el audio es el renderer. La moderacion y `ttsBlocked` tambien pueden omitir
la lectura aunque el chat sea visible.

El usuario no indico un live especifico durante esta auditoria; se utilizo
`emilions27`, encontrado en las recomendaciones LIVE de TikTok. Se verifico
Electron 41.10.7 en desarrollo, con perfiles y puertos temporales. No se
compilo ni instalo un NSIS, ni se publico una nueva version. El fin real de
un directo y restricciones regionales requieren pruebas adicionales; no se
afirman resueltos por estas capturas.

## Repetir las pruebas

Desde el worktree de la app, con el paquete corregido enlazado:

```powershell
npm run build:front
npm test
# Cliente directo, sin dominios de la app:
node_modules/.bin/electron scripts/audit-tiktok-pipeline.js USUARIO direct 30
# Conexion real por HTTP, servidor y renderer de la app:
node_modules/.bin/electron scripts/audit-tiktok-pipeline.js USUARIO server 30
# Capturas del paquete, anuncios activados, audio Google real:
node_modules/.bin/electron scripts/audit-tiktok-pipeline.js astra_fixture fixtures 30
```

`ASTRA_REPORT_PATH` permite guardar JSONL con etapas y contadores. Los logs
de esta auditoria estan en `logs/astra/` (ignorados por Git), especialmente
`astra-original-active.jsonl`, `astra-final-server.jsonl` y
`astra-fixture-audio.jsonl`. No guardan cookies ni firmas completas ni textos
de chat. `ASTRA_CLIENT_MODULE` permite elegir otro modulo solo en modo
`direct`, para comparar con el paquete publicado.

El script usa un perfil temporal, puerto efimero y los opt-outs de pruebas
existentes para cuentas/suscripciones. No cambia la configuracion personal.
