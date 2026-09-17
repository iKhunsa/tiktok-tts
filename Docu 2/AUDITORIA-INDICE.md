# Índice de auditoría de Markdown

Fecha del análisis: 2026-09-17.

Se movieron 50 documentos con `git mv`; no se borró ningún archivo. Ningún archivo protegido fue tocado, incluidos los dos handoffs que ya estaban directamente en `Docu 2/`.

## Contexto histórico — conservar

| Archivo | Destino | Motivo | Recomendación |
|---|---|---|---|
| arquitectura-propuesta.md | `contexto-historico/` | Registra las decisiones del rediseño por dominios ya realizado. | Conservar |
| auditoria-backend-checklist.md | `contexto-historico/` | Conserva hallazgos y fixes de la auditoría de backend cerrada. | Conservar |
| HANDOFF.md | `contexto-historico/` | Bitácora cerrada de los bugs de canales y sus decisiones. | Conservar |
| logging-errores-propuesta.md | `contexto-historico/` | Especifica el criterio de observabilidad usado en el rediseño. | Conservar |
| nota-parche-nuevo-backend.md | `contexto-historico/` | Resume el motivo y alcance del cambio de backend. | Conservar |
| 00-EJECUCION-PROMPTS.md | `contexto-historico/` | Índice de ejecución del rebuild completado. | Conservar |
| fase-00-archivar-backend-viejo.md | `contexto-historico/` | Plan y criterio del archivado inicial del backend. | Conservar |
| fase-01-core.md | `contexto-historico/` | Plan de construcción del kernel, útil para explicar su estructura. | Conservar |
| fase-02-configuracion.md | `contexto-historico/` | Registro de decisiones del dominio de configuración. | Conservar |
| fase-03-idioma.md | `contexto-historico/` | Registro de decisiones del dominio de idioma. | Conservar |
| fase-04-reporte-bug.md | `contexto-historico/` | Registro de decisiones del dominio de reporte de bugs. | Conservar |
| fase-05-moderacion.md | `contexto-historico/` | Registro de decisiones del dominio de moderación. | Conservar |
| fase-06-canales.md | `contexto-historico/` | Registro de decisiones de conectores y canales. | Conservar |
| fase-07-chat.md | `contexto-historico/` | Registro del diseño del flujo de chat. | Conservar |
| fase-08-overlay-movil.md | `contexto-historico/` | Registro del diseño de overlays y móvil. | Conservar |
| fase-09-sonido.md | `contexto-historico/` | Registro del diseño de TTS, música y soundpad. | Conservar |
| fase-10-bot.md | `contexto-historico/` | Registro del diseño del bot. | Conservar |
| fase-11-clips.md | `contexto-historico/` | Registro del diseño de clips y atajos. | Conservar |
| fase-12-avanzado-donar-electron-shell-telemetria.md | `contexto-historico/` | Registro de la fase transversal final del rebuild. | Conservar |
| fase-13-cierre.md | `contexto-historico/` | Checklist de cierre y paridad del rebuild. | Conservar |
| 00-ORQUESTADOR.md | `contexto-historico/` | Define las decisiones y gates del proyecto freemium. | Conservar |
| 01-agente-investigacion.md | `contexto-historico/` | Plan de investigación que fundamentó la solución de suscripciones. | Conservar |
| 01-hallazgos.md | `contexto-historico/` | Hallazgos y decisiones externas de Supabase y Polar. | Conservar |
| 02-agente-backend-datos-supabase.md | `contexto-historico/` | Plan de datos y servicio de cuentas ejecutado. | Conservar |
| 02-contrato-http.md | `contexto-historico/` | Contrato histórico entre la app y el servicio de cuentas. | Conservar |
| 03-agente-integracion-pagos-polar.md | `contexto-historico/` | Plan ejecutado de integración de pagos. | Conservar |
| 03-contrato-checkout.md | `contexto-historico/` | Contrato histórico de checkout y webhooks. | Conservar |
| 04-agente-backend-app-electron.md | `contexto-historico/` | Plan ejecutado de auth y gating en Electron. | Conservar |
| 04-contrato-sesion.md | `contexto-historico/` | Contrato histórico de sesión entre backend y frontend. | Conservar |
| 04-features-pro.md | `contexto-historico/` | Deja constancia de la delimitación Free/Pro acordada. | Conservar |
| 05-agente-frontend-app-electron.md | `contexto-historico/` | Plan ejecutado de la interfaz de cuentas. | Conservar |
| 06-agente-qa-validacion.md | `contexto-historico/` | Casos de validación end-to-end del lanzamiento freemium. | Conservar |
| 06-resultados-qa.md | `contexto-historico/` | Evidencia de QA y bugs corregidos durante el rollout. | Conservar |
| 07-auditoria-seguridad.md | `contexto-historico/` | Registro de vulnerabilidades y mitigaciones aplicadas. | Conservar |
| HANDOFF-suscripcion-freemium.md | `contexto-historico/` | Bitácora de suscripciones; se renombró al moverlo para evitar colisión con el otro HANDOFF. | Conservar |
| 01-dedup-mensajes-msgid.md | `contexto-historico/` | Prompt de un bug resuelto de deduplicación. | Conservar |
| 02-watchdog-inactividad-tiktok-twitch.md | `contexto-historico/` | Prompt de un bug resuelto de watchdog. | Conservar |
| 03-tiktok-error-handler-incompleto.md | `contexto-historico/` | Prompt de un bug resuelto del manejador de errores. | Conservar |
| 04-promo-rearme-en-reconexion.md | `contexto-historico/` | Prompt de un bug resuelto de cadencia promocional. | Conservar |
| 05-youtube-watchdog-agresivo.md | `contexto-historico/` | Prompt de un bug resuelto de watchdog de YouTube. | Conservar |
| 06-kick-sin-eventos-falso-positivo.md | `contexto-historico/` | Prompt de un falso positivo resuelto de Kick. | Conservar |
| 07-glitchtip-ruido-errores-esperados.md | `contexto-historico/` | Prompt de ajuste resuelto de observabilidad. | Conservar |
| 08-boton-fallos-conocidos-muerto.md | `contexto-historico/` | Prompt de un bug de interfaz resuelto. | Conservar |
| 09-respuesta-pequena-100pct.md | `contexto-historico/` | Registro de una decisión de producto sobre la telemetría TTS. | Conservar |
| 10-tts-text-should-be-string.md | `contexto-historico/` | Prompt de validación TTS ya resuelto. | Conservar |

## Candidatos a eliminar — eliminar

| Archivo | Destino | Motivo | Recomendación |
|---|---|---|---|
| NOTAS-PARCHE-v1.8.6.md | `candidatos-a-eliminar/` | Notas de una versión pasada, redundantes con el historial de releases y CHANGELOG. | Eliminar |
| REPORTE-cambios-visuales.md | `candidatos-a-eliminar/` | Reporte puntual de cambios visuales ya aplicados, sin decisión arquitectónica adicional. | Eliminar |

## Revisar caso por caso — decidir

| Archivo | Destino | Motivo | Recomendación |
|---|---|---|---|
| mapa-funciones-actual.md | `revisar-caso-por-caso/` | Mapa técnico posiblemente desactualizado que podría fusionarse con documentación viva. | Decidir |
| 00-findings.md | `revisar-caso-por-caso/` | Auditoría visual con propuestas pendientes que puede alimentar el STYLEGUIDE activo. | Decidir |
| README.md | `revisar-caso-por-caso/` | Estado de la pasada visual; podría fusionarse con STYLEGUIDE si siguen vigentes los pendientes. | Decidir |
