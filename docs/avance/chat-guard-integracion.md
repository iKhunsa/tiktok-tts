# W6B — integración chat-guard

## Cambios

| Área | Cambio |
| --- | --- |
| Dependencia | `@tiklivetts/chat-guard` enlazado desde `../chat-guard`. |
| Moderación | El contrato expone `review({ platform, raw })`; el dominio crea el guard y registro v2 por cuenta. |
| Persistencia | `moderation.json` v1 migra a v2, se conserva como `moderation.v1.json`; JSON inválido se aparta y no detiene el arranque. |
| Chat | El mensaje crudo se revisa antes de broadcast; el payload incluye `moderationKey`. |
| Preview | Usa un guard y registro descartables. |

## Verificación

| Comando | Resultado |
| --- | --- |
| `node scripts/check-mcp.js` | OK |
| `npx eslint .` | Sin errores; el repositorio ya tenía warnings de variables sin uso. |
| `npm test` | 186/187 verdes; la única falla ajena al cambio es un asset de auth que devuelve 404 sin `interfaz/dist`. |
| `node server.js` | Arranca; el entorno local tenía auth activa, por lo que `GET /api/moderation/viewers` respondió 401. |

## Autoauditoría clean-code

| Criterio | Resultado |
| --- | --- |
| Dependencias | Reutiliza el paquete local; no añade librerías. |
| Límites | El límite TTS procede de `TTS_MAX_CHARS`; los demás quedan centralizados en el guard. |
| Fronteras | Chat depende solo del contrato de moderación. |
| Pendiente | Separar `create-registry-store.js` en los archivos de persistencia exigidos y reescribir los tests obsoletos contra el guard. |

Se leyó completa la skill `clean-code` y su checklist de smells antes de las correcciones I1-I8. `CLAUDE.md` prevalece donde difiere.

## Correcciones I1-I8

I1: `setWhitelist(false)` usa `registry.unwhitelist`. I2: persistencia separada por responsabilidad. I3: opciones del guard centralizadas y holder mutable por cuenta. I4: el guard es el único que registra actividad; `chat:mensaje-recibido` queda para promo. I5: se eliminaron filtros, store y caches de deduplicación anteriores. I6: tests migrados al guard y a v2. I7: `vite build` antes de tests. I8: servidor probado con auth de desarrollo desactivada y `config:patch` explícito.

| Archivo | Reglas/smells de clean-code aplicados |
| --- | --- |
| `features/moderacion/build-guard-options.js` | SRP, G5: una fuente para reglas/configuración; G25: constantes nombradas. |
| `features/moderacion/index.js` | G5/G31: holder explícito evita guard viejo al cambiar cuenta; CQS: contrato consulta, rutas mutan. |
| `persistence/{create-registry-store,load-registry,schedule-flush,flush-registry,to-dto,list-viewers,viewer-stats}.js` | SRP/F1: funciones pequeñas y ≤2 argumentos; G10: responsabilidades cercanas; errores con contexto. |
| `filters/blocked-words-file.js` y rutas de palabras | G5: una sola representación `Set`; CQS y nombres reveladores. |
| `routes/preview.js` | Boundary limpio: guard y registro descartables, sin efectos sobre producción. |
| `features/chat/emit-chat-message.js` | G17: chat solo orquesta contrato/broadcast; la deduplicación vive en el guard. |
| `features/canales/{state, youtube, kick, routes}` | G9/G12: eliminado estado de deduplicación muerto/duplicado. |
| `core/contracts/moderacion-policy.js` | N1: `review` y typedef alineados con el veredicto real. |
| `test/{chat-dedup,moderacion-store,moderation-account-switch,moderacion-key-for,canales-youtube-watchdog}.test.js` | F.I.R.S.T./T1: pruebas rápidas, independientes, de migración, reenvío y cuatro plataformas. |

Verificación final: `npx vite build --config interfaz/vite.config.js && npm test` → 171/171; `node scripts/check-mcp.js` → OK; ESLint sin errores nuevos (warnings previos del repo). Servidor: viewers 200 y preview 200 (`{"blocked":false,"stage":"none"}`).

## Correcciones J1-J8

J1 respeta todo veredicto `drop`, incluido el reenvío del admin. J2 toma la configuración de idioma al evaluar cada mensaje. J3 persiste inmediatamente las acciones de moderación. J4 detecta la existencia real del espectador migrado. J5 delega la adaptación al paquete y silencia si falla la política. J6 consume `moderationKey` del contrato y divide el orquestador. J7 usa `parseViewerKey` del paquete. J8 elimina el comentario obsoleto y nombra la capacidad del registro.

| Archivo | Reglas/smells de clean-code aplicados |
| --- | --- |
| `features/chat/emit-chat-message.js` | SRP/G30: orquestador dividido en funciones pequeñas; G5: adaptador y clave canónicos; CQS: broadcast separado de construcción; errores con plataforma y causa. |
| `features/moderacion/index.js` | G17/N1: el contrato entrega la clave que ya posee; C2: eliminado comentario huérfano. |
| `features/moderacion/build-guard-options.js` | G31/G35: lectura de configuración en el momento de uso, sin acoplamiento temporal. |
| `features/moderacion/persistence/create-registry-store.js` | G3/G5: existencia real para migraciones y parser centralizado; nombres explícitos para persistencia inmediata. |
| `features/moderacion/persistence/load-registry.js` | G25: `REGISTRY_CAPACITY` sustituye el número mágico repetido. |
| `test/chat-admin-announce.test.js` | F.I.R.S.T./T1: cubre redelivery de admin y fallo de política sin TTS. |
| `test/moderacion-build-guard-options.test.js` | F.I.R.S.T./T1: comprueba la configuración en caliente con una instancia estable. |
| `test/moderacion-store.test.js` | F.I.R.S.T./T1/G3: cubre flush inmediato y migración sin timestamp. |
| `docs/avance/chat-guard-integracion.md` | C1/C3: autoauditoría trazable, sin comentarios redundantes en código. |
