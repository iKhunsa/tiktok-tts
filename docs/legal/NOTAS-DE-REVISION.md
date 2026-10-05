# Notas de revisión legal — Términos y Privacidad (v2.0)

> Revisión de cumplimiento (LOPDP Ecuador, RGPD/UK GDPR, LGPD, CCPA/CPRA, consumo). **No es asesoría legal**: antes de publicar, revisa con un abogado con experiencia en protección de datos y comercio electrónico.

## Veredicto: avanzar con condiciones

Los textos son coherentes con lo que la app hace hoy. Antes de publicarlos hay que (a) cerrar los `[CONFIRMAR]`, (b) implementar varios puntos técnicos para que lo que dicen sea cierto y (c) decidir sobre tres riesgos jurídicos.

## 1. Marcadores `[CONFIRMAR]` que siguen abiertos (política de privacidad)

| # | Dato | Dónde |
|---|---|---|
| 1 | Alcance del filtrado de los registros de sesión (pueden llevar nombres de usuario) | §2 |
| 2 | Representante en la UE (Art. 27 RGPD), solo si se ofrece activamente a residentes de la UE | §4 |
| 3 | Plazo de purga de copias de seguridad tras eliminar una cuenta (se escribió 30 días) | §5 |
| 4 | Si existe (o existirá) un interruptor para desactivar telemetría | §6 |

Resueltos: proveedor y ubicación del hosting (Hostinger, Manchester, Reino Unido), tratamiento de la IP (solo ubicación aproximada), retención de GlitchTip (sin plazo fijo) y datos del proveedor (solo "iKhunsa, Ecuador" por decisión del dueño).

**Puntos a vigilar de lo decidido:**
- La retención **ilimitada** de errores (GlitchTip) choca con el principio de limitación del plazo de conservación del RGPD/LGPD; se mitiga con el derecho de eliminación a petición.
- El texto dice que la IP "no se usa para identificar"; si los registros del servidor guardan la IP completa, conviene decirlo expresamente.
- Sin RUC/cédula ni domicilio, la identificación del proveedor es mínima; la ley ecuatoriana de comercio electrónico y consumo puede exigir más en ventas a distancia.

## 2. Riesgos jurídicos y mitigación

| Riesgo | Severidad | Mitigación |
|---|---|---|
| **Consentimiento agrupado (decisión del dueño)**: telemetría, analítica, imagen y **publicidad por correo** se aceptan dentro de los Términos, sin casillas separadas. En RGPD/LGPD el consentimiento debe ser específico, libre y retirable, y condicionar el uso a aceptar tratamientos no necesarios es débil; en Ecuador (LOPDP) el consentimiento también debe ser específico e informado. | Alta (UE/Brasil), Media (Ecuador) | Mitigaciones sin casillas: texto claro y visible en los Términos (secciones 7-9), mención destacada en el encabezado, baja de un clic en cada correo, retiro por correo o al eliminar la cuenta, y una línea visible en el registro de cuenta ("Al crear tu cuenta aceptas los Términos, que incluyen publicidad por correo") con enlace. Si se promociona en la UE/Brasil, reconsiderar separar al menos la publicidad. |
| **Sin interruptor de telemetría**: hoy no se puede desactivar desde la app; retirar el consentimiento exige escribir al correo. | Alta (UE) | Agregar en Configuración un interruptor "Compartir datos de uso" que detenga telemetría propia y Aptabase. |
| **Telemetría antes de aceptar**: la app podría enviar datos (p. ej. `installacion`, Aptabase, GlitchTip) antes de que exista una aceptación registrada. | Alta | No inicializar telemetría, Aptabase ni GlitchTip hasta que la aceptación esté guardada (versión + fecha). |
| **"Sin reembolsos y sin excepciones"** choca con el desistimiento de 14 días (UE/RU) y el arrepentimiento de 7 días (Brasil, CDC art. 49), irrenunciables. | Media-Alta | La cláusula 6.9 pide ejecución inmediata y reconocimiento de pérdida del desistimiento; en el checkout de Polar activar el aviso/casilla equivalente. Aun así, para Brasil el plazo de arrepentimiento puede imponerse. |
| **Renovación automática**: leyes de consumo (UE, California, otras) exigen claridad, cancelación fácil y, a veces, recordatorio. | Media | 6.8 lo declara; implementar el recordatorio por correo de planes anuales y mantener la cancelación en la app. |
| **Registros con datos de terceros**: los logs adjuntos a GlitchTip y a reportes de bug pueden contener nicks de espectadores. | Media | Sanitizar logs (quitar nicks/mensajes) antes de enviar; avisar en el formulario de bug. |
| **Imagen de canales** (foto, nombre) para promoción dentro de un clic de aceptación. | Media | Casilla opcional separada o interés legítimo + derecho de oposición; no usar canales de menores (8.6). |
| **Publicidad de "otros proyectos"** por correo. | Media | Casilla separada sin marcar (ya decidido), registro de prueba del consentimiento, baja en un clic y dirección/identificación del remitente (CAN-SPAM). Lista de los proyectos o categoría clara. |
| **Transferencias internacionales** y falta de DPAs/SCC con proveedores (Google, Discord, Polar, Vercel, hosting). | Media | Aceptar los DPA estándar de cada proveedor; documentar el registro de actividades (Art. 30 RGPD). |
| **Instalador sin firma**: aviso de Windows; ya declarado en 4.2. | Baja | Firmar el instalador cuando sea posible. |

## 3. Qué hay que implementar para que los textos sean ciertos

1. **Instalador NSIS**: página de licencia con los Términos y la Privacidad, aceptación obligatoria, sin casillas adicionales.
2. **Aceptación en cada instalación y en cada actualización**: el actualizador ya instala en modo no silencioso (`quitAndInstall(false, true)`); hay que garantizar que el asistente NSIS muestre la página de licencia también al actualizar (por defecto electron-builder puede omitir páginas en actualizaciones) y registrar versión + fecha de la aceptación.
3. **Línea de aviso en el registro de cuenta** con enlace a los Términos y mención a la publicidad por correo (sin casilla), y guardar la prueba (fecha + versión).
4. **Botón "Eliminar cuenta"** (en curso por un worker): borra cuenta, correo e historial y cancela el plan; debe cubrir el cliente de Polar.
5. **Interruptor de telemetría** y bloqueo de telemetría hasta aceptar (ver §2).
6. **Sanitizar logs** antes de GlitchTip y reportes de bug.
7. **Actualizar la landing**: `terminos.html`, `privacidad.html` y sus versiones en inglés (hoy dicen "sin planes de pago", "sin cuentas" y "no se usan para publicidad de otros proyectos", que ya no es cierto).
8. **Traducción al inglés** de ambos documentos (prevalece el español).

## 4. Aprobaciones y revisión externa

| Quién | Para qué | Estado |
|---|---|---|
| Abogado (datos personales + comercio electrónico, Ecuador) | Validar bases legales, cláusulas de responsabilidad, consumo y prueba del consentimiento | Pendiente |
| Revisión por mercado objetivo (UE/UK/Brasil) | Representante en la UE, SCC, DPO/encarregado, plazos | Pendiente si se promociona allí |
| Polar | Confirmar quién notifica la renovación y cómo configurar el aviso de desistimiento en el checkout | Pendiente |


## 5. Promesas retiradas del texto (no están implementadas)

Se quitaron de los Términos y la Privacidad (ES y EN) porque el producto aún no las cumple. Volver a agregarlas **solo cuando existan**:

| Promesa retirada | Dónde estaba | Qué se necesita para cumplirla |
|---|---|---|
| Recordatorio por correo antes de renovar un plan anual | T&C 6.8 | Que Polar lo envíe o un correo propio programado |
| Enlace de baja de un clic en cada correo comercial, con identificación del remitente | T&C 9.3 y 9.4, Privacidad §6 y §8 | Herramienta de envío con baja automática |
| Prueba del consentimiento de correo (fecha y versión) guardada en la cuenta | T&C 2.4 y 9.4 | Registrar la aceptación en el backend de cuentas al registrarse |
| Garantía de que los registros enviados a errores y reportes se recortan | Privacidad §2 | Sanitizar logs antes de GlitchTip y Discord |

**Importante:** hoy la baja de la publicidad se hace escribiendo a info@tiklivetts.es o eliminando la cuenta. Antes de enviar el **primer correo comercial** debe existir un enlace de baja en el propio correo: lo exigen las leyes de correo comercial (CAN-SPAM, RGPD/ePrivacy, LGPD) aunque el texto no lo prometa.

## 6. Palabras bloqueadas compartidas (publicado en v2.1)

**Estado: PUBLICADO** el 5 de octubre de 2026 como versión 2.1 de los cuatro textos (`politica-de-privacidad.md`, `privacy-policy.en.md`, `terminos-y-condiciones.md`, `terms-and-conditions.en.md`) y en la web (`tiklivetts.es/privacidad.html`, `terminos.html` y sus páginas en inglés). La app envía por defecto la lista de palabras bloqueadas saneada, sin nombres ni IDs de espectadores ni mensajes de chat, al servidor propio de telemetría; `blockedWordsTelemetryDisabled` (default `false`) queda solo como llave técnica de apagado, sin UI. Decisiones tomadas: umbral de 3 usuarios distintos, lógica "solo sumar", conservación de 365 días desde el último envío que incluya la palabra (`purgeOldBlockedWords` en telemetria-tts) y borrado por info@tiklivetts.es o Discord. Base legal: aceptación de los Términos e interés legítimo.

**Pendiente:** revisión por un abogado (como el resto de estos textos).
