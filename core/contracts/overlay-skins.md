# Catálogo, escenas y skins

El catálogo guarda sus ajustes en `overlays`. Las escenas Pro guardan ajustes
completos en `escenas[].ajustes`, sin heredar cambios posteriores del catálogo.
Los recursos GIF del editor viven en `capasGif`. La biblioteca de archivos `.epik`
y las favoritas son comunes; los parámetros de cada paquete se guardan dentro
del overlay o capa que lo usa (`ajustes.epik[id]`).

La migración `versionDominiosOverlay: 1` toma una copia del aspecto anterior de
cada escena y de sus parámetros `.epik`. No elimina escenas al perder Pro.

## Derechos de uso

La sesión recibida del servicio de cuentas es la única fuente de derechos:

- `plan: "pro"`, con sesión válida y sin vencer, habilita el editor y la
  reproducción de escenas, y los diseños incluidos en Pro.
- `entitlements: ["skin:terminal"]` concede una skin nativa de forma independiente
  del plan. Para paquetes se usa `skin:epik:<id>`.
- `licenciasSkins: { "epik:<id>": "pro" }` identifica paquetes de la tienda
  disponibles únicamente mientras se tenga Pro.
- `licenciasSkins: { "epik:<id>": "adquirida" }` concede uso permanente. También
  admite ids de skins nativas, como `terminal`.

El servicio debe devolver las restricciones de los paquetes de tienda también
en el plan gratis. La app no deduce compras a partir de favoritos, escenas,
importaciones, respaldos ni campos del manifest. Los paquetes personales y las
plantillas que no forman parte del catálogo comercial siguen siendo gratuitos.
Importar un archivo no concede una licencia de tienda.

Este repositorio consume esos derechos; su tienda actual contrata Pro. El alta
de compras individuales y la clasificación de paquetes comerciales deben ser
emitidas por el servicio de cuentas, no por una escritura local del renderer.

## Reproducción

`GET /api/overlays/acceso` publica únicamente la política de reproducción, sin
token, correo ni datos del perfil. Los overlays abiertos la revisan cada tres
segundos: al perder una skin de Pro usan la estándar, conservando el diseño
solicitado para una renovación. Un cambio de cuenta fuerza una recarga.

`GET /api/overlays/escena?e=<id|dinamica>` devuelve las URLs solo con Pro.
El compositor consulta cada segundo y retira sus capas si el acceso se pierde.
Los enlaces antiguos `?l=` también comprueban Pro. Un error de red no conserva
una escena de pago en pantalla. Los recursos de paquetes `.epik` restringidos
también comprueban la licencia en el servidor.

Las demos de tienda (`preview=1&demo=1`) de chat, ranking y música muestran
ejemplos sin WebSocket ni datos del directo. No habilitan reproducción real.
