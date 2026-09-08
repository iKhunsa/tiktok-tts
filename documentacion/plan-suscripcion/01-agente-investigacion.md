# Agente 01 — Investigación

## Objetivo

Resolver todas las incógnitas que hoy bloquean a los agentes de implementación:
qué expone realmente el servidor MCP de Supabase y el de Polar (y sus límites),
cómo va a recibir la app los eventos de suscripción (webhook receiver), cuál es la
forma del esquema de datos, y cuál es el contrato HTTP del `servicio-cuentas`.
Entrega un único documento `01-hallazgos.md` que los agentes 02–05 leen como
punto de partida. **No escribe código de producción** — como mucho scripts de
sondeo descartables.

## Dependencias explícitas

- Ninguna. Es la Fase 0. Arranca con solo `00-ORQUESTADOR.md` como contexto.
- Los servidores MCP de Supabase, Polar, Coolify y Hostinger ya están conectados
  en la sesión del orquestador — este agente los usa para sondear, no para
  cambiar nada.

## Contrato de entrada

| Artefacto | De quién | Qué es |
|---|---|---|
| `00-ORQUESTADOR.md` | orquestador | Nomenclatura congelada, decisión "MCP solo para DEV / runtime REST", lista de fases. |
| Acceso MCP Supabase | sesión | `list_projects`, `list_tables`, `list_extensions`, `execute_sql`, `apply_migration`, `get_advisors`, `search_docs`, etc. |
| Acceso MCP Polar | sesión | tools de Polar (a enumerar en la tarea 2). |
| Repo `telemetria-tts` | usuario (si aplica) | Referencia del patrón modular para decidir si `servicio-cuentas` va ahí o en repo nuevo. |

## Contrato de salida

**`documentacion/plan-suscripcion/01-hallazgos.md`**, con estas secciones:

1. **MCP Supabase** — proyecto(s) existentes, versión de Postgres, extensiones
   instaladas (¿`pgcrypto`, `pg_cron`?), si `auth.users` de Supabase Auth está
   disponible o hay que modelar usuarios a mano, límites de `execute_sql` /
   `apply_migration`, y si las migraciones se pueden versionar vía MCP o hay que
   usar la CLI de Supabase en el VPS.
2. **MCP Polar** — lista de tools, cuáles crean producto/precio, cuáles generan
   checkout, si expone gestión de webhooks o hay que configurarlos en el panel de
   Polar a mano, qué eventos de suscripción manda Polar y con qué payload, cómo se
   verifica la firma del webhook, si hay entorno sandbox.
3. **Decisión: webhook receiver** — confirmar el modelo del orquestador
   (`servicio-cuentas` en el VPS recibe los webhooks) y elegir el subdominio
   (`auth.tiklivetts.es` u otro). Documentar la alternativa de polling y por qué
   se descarta (o no).
4. **Decisión: repo de `servicio-cuentas`** — carpeta nueva en `telemetria-tts`
   vs. repo hermano. Criterio: si comparte despliegue/infra con telemetría, va
   ahí; si no, repo aparte. Anotar la decisión y el motivo.
5. **Borrador de esquema de datos** — nombres de tabla y columnas clave (no el DDL
   final, eso es del agente 02), relación usuario ↔ plan activo, dónde vive el
   estado de cuenta.
6. **Borrador de contrato HTTP** — lista de rutas del `servicio-cuentas`
   (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/session`,
   `/api/entitlements`, `/api/checkout`, `/api/webhooks/polar`) con un esbozo de
   request/response. El agente 02 lo congela.
7. **Riesgos abiertos** — cualquier cosa que no se pudo resolver sondeando y que
   necesita decisión del usuario.

## Tareas

- [ ] **1.** Leer `00-ORQUESTADOR.md` completo. Anotar la nomenclatura congelada
  — todos los nombres de `01-hallazgos.md` tienen que coincidir.
- [ ] **2.** Sondear el MCP de Supabase: `list_projects`, `list_organizations`,
  y sobre el proyecto del VPS `list_tables`, `list_extensions`, `list_migrations`,
  `get_advisors {type:'security'}`. Registrar versión de Postgres y si Supabase
  Auth (`auth.users`) está habilitado.
- [ ] **3.** Con `search_docs` (MCP Supabase) resolver: cómo versionar migraciones
  self-hosted, cómo se declaran políticas RLS, si `pg_cron` está disponible para
  el job de reconciliación o hay que cronearlo desde `servicio-cuentas`.
- [ ] **4.** Enumerar los tools del MCP de Polar (delegar en el **agente auxiliar
  de sondeo MCP**, ver Delegación). Para cada tool relevante anotar: qué hace,
  qué inputs pide, qué devuelve.
- [ ] **5.** Determinar el flujo de checkout de Polar: ¿el MCP genera la URL de
  checkout o hay que llamar la API REST de Polar desde `servicio-cuentas`? ¿Qué
  parámetros necesita (product_id, success_url, customer_email)?
- [ ] **6.** Determinar los webhooks de Polar: eventos de ciclo de vida de
  suscripción (`subscription.created`, `subscription.active`,
  `subscription.canceled`, `subscription.revoked`, o los nombres reales),
  estructura del payload, header de firma y algoritmo de verificación, si hay
  sandbox para pruebas.
- [ ] **7.** Confirmar el modelo de webhook receiver con el orquestador: la app de
  escritorio no recibe webhooks → `servicio-cuentas` en el VPS es el receptor.
  Elegir subdominio y anotarlo para la Fase 6 (DNS Hostinger).
- [ ] **8.** Decidir repo de `servicio-cuentas` (carpeta en `telemetria-tts` vs
  repo nuevo). Si hace falta ver la estructura de `telemetria-tts`, delegar en el
  **agente auxiliar de lectura de repo externo**.
- [ ] **9.** Escribir el borrador de esquema: `users`, `plans`, `subscriptions`,
  `entitlements`, `webhook_events`. Columnas mínimas por tabla, claves foráneas,
  qué determina `plan` efectivo de un usuario.
- [ ] **10.** Escribir el borrador de contrato HTTP: las ~8 rutas con
  request/response esbozados y los códigos de error previstos.
- [ ] **11.** Redactar `01-hallazgos.md` con las 7 secciones del contrato de
  salida. Marcar cada riesgo abierto con `⚠️` y una pregunta concreta.
- [ ] **12.** Actualizar `HANDOFF.md`: fila del agente 01 a "hecho", listar los
  riesgos abiertos, y marcar que el set queda **en pausa para revisión del
  usuario** antes de arrancar el agente 02.

## Criterios de "hecho"

1. `documentacion/plan-suscripcion/01-hallazgos.md` existe y tiene las 7 secciones
   listadas en "Contrato de salida".
2. La sección "MCP Polar" lista al menos: el/los tool(s) de creación de producto,
   el/los de checkout, y el mecanismo de webhooks — con nombres reales de tool,
   no genéricos.
3. La sección "MCP Supabase" indica versión de Postgres, si Supabase Auth está
   disponible, y cómo se versionan las migraciones en este setup self-hosted.
4. El borrador de esquema nombra las 5 tablas y, por cada una, al menos su clave
   primaria y sus claves foráneas.
5. El borrador de contrato HTTP tiene las 8 rutas, cada una con método, path,
   forma de request y forma de response.
6. Toda incógnita no resuelta está en "Riesgos abiertos" como pregunta accionable
   para el usuario (no como "habría que ver").
7. `HANDOFF.md` refleja el estado y la pausa de revisión.
8. No se creó ninguna tabla, producto de Polar, ni recurso de infra real — solo
   sondeo de lectura.

## Delegación

| Tarea concreta a delegar | A qué subagente | Info mínima que le paso | Qué espero de vuelta |
|---|---|---|---|
| Enumerar y probar los tools del MCP de Polar (tarea 4–6) | **auxiliar de sondeo MCP** (nuevo, read-only) | "Listá todos los tools del MCP de Polar. Para checkout, webhooks y creación de producto, mostrá input schema y un ejemplo de respuesta. No crees nada." | Tabla tool → propósito → inputs → output de ejemplo; nombres de eventos de webhook y estructura de payload. |
| Leer la estructura del repo `telemetria-tts` para decidir dónde va `servicio-cuentas` (tarea 8) | **auxiliar de lectura de repo externo** (Explore, read-only) | Ruta del repo `telemetria-tts` (o URL), y "reportá el layout: index.js, runtime.js, transport.js, connectors/, cómo se despliega (Dockerfile, compose), cómo se cargan secrets". | Árbol de archivos + resumen del patrón de despliegue en ≤ 20 líneas. |
| Verificar contra la doc de Supabase cómo se hace RLS + migraciones versionadas self-hosted (tarea 3) | `search_docs` del MCP de Supabase directamente (no es un subagente, es una tool) | Consultas concretas: "RLS policies self-hosted", "migration versioning CLI self-hosted", "pg_cron availability". | Fragmentos de doc relevantes. |
| Redacción final de `01-hallazgos.md` a partir de las notas crudas | **nadie** — lo hace el propio agente 01 | — | — |

Motivo de acotar: el sondeo de Polar y la lectura del repo externo generan mucho
output de bajo valor para el contexto del agente 01. Delegando, el agente 01 solo
recibe la síntesis y la usa para redactar.

## Riesgos y rollback

- **El MCP de Polar no expone webhooks ni checkout** → hay que usar la API REST de
  Polar desde `servicio-cuentas`. No es bloqueante, pero cambia el plan del agente
  03: anotarlo claramente en `01-hallazgos.md` para que 03 no asuma MCP.
- **Supabase Auth no está habilitado en el self-hosted** → modelar `users` a mano
  con hash de password (`pgcrypto`/`bcrypt` en `servicio-cuentas`). Anotar la
  decisión; afecta al agente 02.
- **No hay sandbox de Polar** → el Gate C se prueba en modo test de Polar con una
  tarjeta de prueba; documentar el procedimiento exacto para el agente 06.
- Rollback: este agente no deja estado. Si `01-hallazgos.md` queda mal, se
  re-ejecuta; nada que revertir.
