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
| `npm test` | 188/196 verdes; 7 pruebas antiguas de `chat-dedup` esperan el dedup eliminado de chat, y una de assets de auth devuelve 404 sin `interfaz/dist`. |
| `node server.js` | Arranca; el entorno local tenía auth activa, por lo que `GET /api/moderation/viewers` respondió 401. |

## Autoauditoría clean-code

| Criterio | Resultado |
| --- | --- |
| Dependencias | Reutiliza el paquete local; no añade librerías. |
| Límites | El límite TTS procede de `TTS_MAX_CHARS`; los demás quedan centralizados en el guard. |
| Fronteras | Chat depende solo del contrato de moderación. |
| Pendiente | Separar `create-registry-store.js` en los archivos de persistencia exigidos y reescribir los tests obsoletos contra el guard. |

La skill `clean-code` indicada no estaba disponible en `.agents/skills/`; se aplicaron los criterios incluidos en el plan. `CLAUDE.md` prevalece donde difiere.
