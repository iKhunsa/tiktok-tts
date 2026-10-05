# BORRADOR — Actualización de la Política de Privacidad: palabras bloqueadas

> **ESTADO: BORRADOR PENDIENTE DE APROBACIÓN DEL DUEÑO. NO PUBLICAR.** No sustituye a `politica-de-privacidad.md` (vigente). Debe publicarse antes de lanzar una versión que active este envío. Ver `NOTAS-DE-REVISION.md` §6.

Cambios propuestos sobre la política vigente. Cada bloque indica la sección y si **agrega** o **reemplaza** texto.

## §1 Resumen — agregar una viñeta

- Enviamos las palabras de tu lista de palabras bloqueadas, seudonimizadas (asociadas a un identificador técnico de tu instalación, nunca a tu nombre), para mejorar el filtro de moderación.

## §2 Datos que tratamos — agregar una fila a la tabla

| Dato | Para qué | Base |
|---|---|---|
| **Palabras de tu lista de palabras bloqueadas**: el texto de cada palabra tal como lo escribiste en tu lista, normalizado (minúsculas, sin tildes salvo la ñ), el idioma de voz configurado y la fecha del envío. **Sin tu nombre ni el de tus espectadores, sin mensajes de chat.** Antes de enviar, la App descarta entradas que contengan `@`, enlaces, correos, números largos (6 o más dígitos), más de 3 palabras o más de 40 caracteres | Mejorar el filtro de moderación de la App | Aceptación de los **Términos** e **interés legítimo** de mejorar el filtro |

Texto explicativo (agregar bajo la tabla):

> Las palabras se asocian a un identificador seudonimizado de tu instalación solo para contar **cuántos usuarios distintos** bloquean una misma palabra. Nunca se muestra ni se exporta qué usuario bloqueó qué palabra. Para mejorar el filtro solo se usan las palabras bloqueadas por **varios usuarios** (como mínimo 3); las demás se guardan, pero no se ven ni se utilizan. El envío es acumulativo: si más adelante quitas una palabra de tu lista, la palabra enviada antes no se elimina del recuento; puedes pedir su borrado (ver §6).

## §3 Con quién compartimos — sin cambios

Las palabras se envían solo a nuestro servidor propio de telemetría (Hostinger, Manchester). No se comparten con terceros.

## §5 Cuánto tiempo guardamos los datos — agregar viñeta

- **Palabras bloqueadas compartidas:** hasta **365 días** asociadas a tu instalación, igual que el resto de la telemetría; después se borran automáticamente.

## §6 Tus derechos — agregar / ajustar

- **Borrado:** escribe a info@tiklivetts.es o por Discord y borraremos las palabras asociadas a tu instalación.

## Preguntas abiertas para el dueño

1. ¿El umbral mínimo se queda en 3 usuarios distintos? (el servidor lo hace configurable).
2. ¿Se mantiene la lógica "solo sumar" (una palabra quitada sigue contando)? Si no, hay que retirar la frase del texto explicativo.
3. Fecha de entrada en vigor y mecanismo de aviso a usuarios existentes (§13).
