# Política de Privacidad de TikLiveTTS

**Versión del documento:** 2.0 · **Vigencia desde:** 2 de octubre de 2026
**Responsable del tratamiento:** iKhunsa (Ecuador)
**Contacto de privacidad y encargado de datos (DPO/encarregado):** iKhunsa — info@tiklivetts.es

Esta política explica qué datos trata TikLiveTTS (la "App"), para qué, con quién los compartimos, cuánto tiempo los guardamos y cómo ejercer tus derechos. Complementa los [Términos y Condiciones](terminos-y-condiciones.md). Está pensada para cumplir con la Ley Orgánica de Protección de Datos Personales de Ecuador (LOPDP) y, en lo aplicable, con el RGPD (UE) y la LGPD (Brasil).

---

## 1. Resumen

- La App funciona **en tu equipo**: overlays, TTS, soundpad y moderación se ejecutan localmente.
- Enviamos a **servidores propios** telemetría de uso, analítica y errores. No vendemos tus datos.
- Si creas una cuenta, guardamos tu **correo y nombre**. Los pagos los procesa **Polar**.
- El texto que se **lee en voz alta** se envía a **Google** para generar el audio.
- Puedes **eliminar tu cuenta** y tus datos desde el botón "Eliminar cuenta" de tu perfil.

## 2. Datos que tratamos, para qué y con qué base

| Datos | Finalidad | Base legal |
|---|---|---|
| **Cuenta**: correo, nombre, contraseña (almacenada solo como hash), fecha de registro | Crear y gestionar tu cuenta, iniciar sesión, seguridad | Ejecución del servicio |
| **Suscripción**: plan, intervalo (mensual/anual), estado, fecha de renovación, identificador de cliente en Polar | Activar tus funciones de pago, cancelar/renovar | Ejecución del contrato |
| **Pagos**: los procesa Polar. No recibimos ni guardamos tu número de tarjeta | Cobro y facturación | Ejecución del contrato (Polar es responsable de los datos de pago) |
| **Telemetría propia** (`telemetria.tiklivetts.es`): huella seudonimizada y no reversible de tu equipo (hash de usuario de Windows y nombre del equipo), identificador de sesión, versión de la App y del sistema, idioma, **ubicación aproximada (país y ciudad por IP)**, plataformas y canales conectados, conteos de uso de funciones, ajustes activados (sí/no) y errores técnicos recortados | Medir el uso, priorizar funciones, detectar fallos | Consentimiento (al aceptar estos términos) e interés legítimo en mejorar y proteger el servicio |
| **Identidad pública de tus canales**: nombre de usuario, nombre público, foto de perfil, seguidores (de las API públicas de cada plataforma) | Estadísticas de uso y promoción (ver §7) | Consentimiento |
| **Analítica de producto con Aptabase** (`aptabase.tiklivetts.es`, instancia propia): eventos de instalación, sesión y uso de funciones, país, versión de la App. Sin nombres de usuario, mensajes ni textos libres | Entender qué funciones se usan | Consentimiento e interés legítimo |
| **Reportes de errores con GlitchTip** (`glitchtip.tiklivetts.es`, instancia propia): errores y cierres inesperados, estado de la App (plataformas, OBS, ajustes), fragmento del registro de la sesión, el identificador de instalación y sesión y el nombre de los canales conectados | Corregir errores | Interés legítimo y consentimiento |
| **Reportes de bug y sugerencias** que tú envíes: tu usuario de Discord, el enlace de tu canal, tu descripción y, en bugs, el registro de la sesión | Atender tu reporte | Consentimiento (lo envías tú) |
| **Texto leído en voz alta** (puede incluir el nombre de quien escribió si activas esa opción) | Generar el audio con el servicio de voz de Google Translate | Ejecución del servicio |
| **Registros locales y ajustes** (en tu carpeta de datos de la App): configuración, moderación, soundpad, sesión de TikTok | Funcionamiento de la App en tu equipo | Ejecución del servicio — **no los recibimos** |
| **Correo para publicidad** (el que compartes al crear tu cuenta o al pagar) | Publicidad, ofertas y novedades de TikLiveTTS y de otros proyectos de iKhunsa | Consentimiento (incluido en la aceptación de los Términos), revocable |

**Aclaraciones:**
- La huella de equipo es un dato **seudonimizado**: no contiene tu nombre, pero sigue siendo un dato personal porque identifica de forma estable tu instalación.
- Tu IP se usa solo para estimar tu **ubicación aproximada** (país y ciudad), no tu ubicación exacta, y no la usamos para identificarte. Esa aproximación nos da una idea general de dónde se usa la App.
- Los registros de sesión que se adjuntan a errores y reportes **pueden contener nombres de usuario** de las plataformas conectadas. No garantizamos que se filtren.
- **No tratamos** el contenido de los mensajes del chat de tus espectadores como parte de la telemetría, ni tus contraseñas de TikTok, Twitch, YouTube o Kick. La sesión de TikTok se guarda localmente.
- No tomamos **decisiones automatizadas** ni elaboramos perfiles que produzcan efectos jurídicos sobre ti.
- No tratamos categorías especiales de datos (salud, biometría, origen, etc.).

## 3. Con quién compartimos los datos

No vendemos datos personales ni los usamos para publicidad de terceros. Los compartimos solo con proveedores que hacen posible el servicio:

- **Polar** — pagos, facturación e impuestos (comerciante de registro).
- **Google** — síntesis de voz (Google Translate TTS) y, si abres el video de Novedades o escuchas música, YouTube.
- **Discord** — recibe los reportes de bug y sugerencias que envías, y es el canal de la comunidad.
- **GitHub** — descarga y actualización de la App (GitHub ve tu IP al consultar las Releases).
- **Hostinger** — alojamiento de nuestros servidores (cuentas, telemetría, analítica y errores) en un VPS ubicado en **Manchester, Reino Unido** (Europa).
- **Umami** (instancia propia) — analítica agregada y sin cookies de nuestro sitio web.
- Políticas de privacidad de estos proveedores: Polar <https://polar.sh/legal/privacy> · Google <https://policies.google.com/privacy> · Discord <https://discord.com/privacy> · GitHub <https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement> · Hostinger <https://www.hostinger.com/legal/privacy-policy>.
- Autoridades, cuando una ley o una orden válida lo exija.

## 4. Transferencias internacionales

Algunos proveedores (Google, Discord, GitHub, Polar, Hostinger) pueden tratar datos fuera de tu país. Soy de Ecuador y nuestros servidores propios se alojan en **Manchester, Reino Unido**. Cuando tus datos salen del Espacio Económico Europeo, del Reino Unido o de Brasil, nos apoyamos en las garantías de cada proveedor (decisiones de adecuación, cláusulas contractuales tipo o mecanismos equivalentes) y en tu consentimiento, necesario para prestar el servicio. Puedes pedirnos información sobre estas garantías en info@tiklivetts.es.

## 5. Cuánto tiempo guardamos los datos

- **Telemetría y analítica:** hasta **365 días**; después se borran automáticamente.
- **Cuenta y suscripción:** mientras tu cuenta exista. Al eliminarla borramos tu cuenta, correo e historial de suscripción de nuestros sistemas.
- **Pagos:** Polar conserva los registros de transacciones el tiempo que exijan las normas contables y fiscales; no los controlamos.
- **Errores (GlitchTip):** sin plazo fijo; se conservan mientras sean útiles para corregir errores y mejorar la estabilidad, y puedes pedir su eliminación.
- **Reportes en Discord:** hasta que los retiremos o nos pidas borrarlos.
- **Registros locales:** en tu equipo, hasta que los borres o desinstales la App.
- **Copias de seguridad:** los datos eliminados se purgan también de las copias de seguridad en un plazo de hasta 30 días.

## 6. Tus derechos y cómo ejercerlos

Tienes derecho a **acceso, rectificación, eliminación, oposición, limitación, portabilidad** y a **retirar tu consentimiento** en cualquier momento, sin efecto retroactivo.

- **Eliminar tu cuenta y tus datos de cuenta:** botón **"Eliminar cuenta"** en tu perfil (vista Cuenta). Es inmediato e irreversible.
- **Telemetría y analítica asociadas a tu instalación:** escríbenos a info@tiklivetts.es o por Discord y te ayudamos a identificarla y borrarla. Hoy la App no incluye un interruptor para desactivar la telemetría; puedes dejar de enviarla desinstalando la App o escribiéndonos.
- **Publicidad por correo:** escríbenos a info@tiklivetts.es o elimina tu cuenta.
- **Retirar la autorización de uso de imagen:** eliminando tu cuenta o escribiéndonos (ver §7).

También puedes **oponerte** a los tratamientos basados en nuestro interés legítimo. Para protegerte, podemos pedirte que confirmes tu identidad antes de entregar o borrar datos.

Responderemos **sin demora y como máximo en 30 días** (15 días cuando la LGPD lo exija). Podemos prorrogar el plazo cuando la ley lo permita, avisándote. Si no atendemos tu solicitud, te explicaremos el motivo y la norma en que nos basamos. Si consideras que no respetamos tus derechos, puedes reclamar ante la autoridad de tu país: en Ecuador, la Superintendencia de Protección de Datos Personales; en la UE, la autoridad de tu Estado miembro; en Brasil, la ANPD.

## 7. Uso de imagen y datos públicos de tus canales

Con tu aceptación, usamos los **datos públicos** de tus canales (nombre de usuario, nombre público, foto de perfil, logotipo y métricas visibles) para **promocionar TikLiveTTS** en nuestro sitio, redes sociales, materiales y dentro de la App. La autorización es **no exclusiva, gratuita y revocable**, dura mientras exista tu cuenta o uses la App, y se retira eliminando tu cuenta o escribiéndonos. No usamos contenido privado ni los mensajes de tu chat. Detalle en los Términos, sección 8.

## 8. Publicidad por correo electrónico

Al aceptar los Términos y compartir tu correo, consientes que lo usemos para enviarte publicidad, ofertas y novedades de TikLiveTTS y de otros proyectos de iKhunsa. No compartimos ni vendemos tu correo a terceros para su propia publicidad. Puedes retirar tu consentimiento cuando quieras escribiendo a info@tiklivetts.es o eliminando tu cuenta; seguirás recibiendo los correos transaccionales necesarios (pagos, seguridad, cambios de términos).

## 9. Seguridad

Las comunicaciones con nuestros servidores usan **HTTPS**; las contraseñas se guardan solo como hash; las credenciales de la App se almacenan localmente; y nuestros servicios son instancias propias con acceso restringido. Ningún sistema es infalible: si ocurriera una brecha que afecte tus datos, te lo notificaremos sin demora injustificada y avisaremos a la autoridad competente dentro de los plazos legales (por ejemplo, 72 horas en el RGPD).

## 10. Menores

La App no está dirigida a menores de 13 años y no recogemos datos de ellos a sabiendas. Los menores de 18 años solo pueden usarla con permiso y bajo la responsabilidad de su representante legal, quien acepta estos documentos por ellos. No usamos datos ni imagen de canales de menores para promoción. Si detectamos datos de un menor sin autorización, los eliminaremos.

## 11. Residentes de California y otros estados de EE. UU.

No **vendemos** datos personales ni los **compartimos** para publicidad conductual entre contextos. Si resides en California u otro estado con ley de privacidad, puedes pedir saber qué datos tenemos, corregirlos o borrarlos, y no te discriminaremos por ejercer esos derechos. Las solicitudes se atienden por los mismos canales de la sección 6 (respuesta en un máximo de 45 días).

## 12. Nuestro sitio web

El sitio es estático, **no usa cookies** ni formularios que recojan datos personales. Medimos visitas con una instancia propia de **Umami**, sin cookies y sin crear perfiles. La tipografía se carga desde **Google Fonts**, por lo que tu navegador consulta servidores de Google.

## 13. Cambios en esta política y registro de aceptación

Guardamos la versión de esta política que aceptaste y la fecha. El instalador te la muestra en cada instalación y actualización y debes aceptarla de nuevo cada vez. Publicaremos la versión actualizada con su fecha de vigencia y te avisaremos en la App cuando el cambio sea relevante. Si el cambio amplía el uso de tus datos, volveremos a pedir tu consentimiento cuando la ley lo exija.

## 14. Contacto

Responsable: **iKhunsa** (Ecuador) · info@tiklivetts.es · Discord: <https://discord.com/invite/mwY859tcQK> · Repositorio: <https://github.com/iKhunsa/tiktok-tts>
