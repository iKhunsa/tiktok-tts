# Regla de modularidad — "un archivo por función" + antes reusar

La estructura es **un archivo `.js` por función/responsabilidad** (backend y frontend). Si una responsabilidad necesita varios archivos (estado + helpers), se agrupan en una carpeta con su `index.js`. 

**Nombres de archivo en kebab-case inglés** describiendo lo que exportan; **carpetas de dominio/vista en kebab-case español**.

## "Un archivo por función" ≠ "copiar y pegar"

Antes de escribir un helper:

1. **Grepealo.** Si ya existe en el repo — aunque sea en otro dominio — reusalo, no lo reimplementes.
2. **Si dos o más lugares necesitan la misma lógica**, va en **UN** archivo compartido, nunca duplicado:
   - Backend puro (sin estado, sin config) → `core/<nombre>.js` (ej. `core/config-snapshot.js`)
   - Backend con orden de ejecución / inyección → contrato en `core/contracts/*.js`
   - Frontend agnóstico de vista → `interfaz/src/nucleo/` o `interfaz/compartido/` (este último si además lo usan los overlays)
3. **Un dominio nunca comparte su helper importándolo desde otro dominio.** Si `sonido/` y `moderacion/` necesitan lo mismo, sube a `core/`.

## Señales de que te pasaste (borrar, no crear)

- Un archivo que **solo re-exporta** otro (barrel de un símbolo)
- Un contrato/factory/wrapper con **un solo productor y un solo consumidor** y sin lógica propia — inline en el call site
- Un flag de config que nadie prende/apaga (siempre el mismo valor)

## Umbral — dónde vive un helper (por alcance, no por conteo)

| Consumidores | Ubicación | Ejemplo |
|---|---|---|
| **1** | Inline en el call site, o local al dominio si ya tiene carpeta. No sube. | `telemetria/identity.js#sessionId` → 1, se queda |
| **2+ en el MISMO dominio** | Archivo compartido dentro de esa carpeta de dominio | `sonido/tts/cache.js` reutilizado en `sonido/musica/` |
| **2+ CRUZANDO dominio** | `core/<nombre>.js`, siempre. El disparador es el cruce, no el número. | `getConfigSnapshot` → 5 dominios → `core/config-snapshot.js` |

**Regla de pulgar:** la 2ª copia textual es olor; la 3ª es un bug. Al ver la 2ª, extraé al alcance más chico que la cubra.

## Cuándo un `core/contracts/*.js` (y no un `core/<nombre>.js` pelado)

Incluso a n=1, solo si compra una de estas tres:

1. **Desacople de una dependencia pesada/opcional.** `perf.js` evita que `sonido/` haga `require('@sentry/electron')`. Sin el contrato, el dominio queda atado a Sentry.
2. **Orden de arranque forzado / inyección.** `obs-replay.js` garantiza que el productor (`canales/obs`) registró su impl antes de que el consumidor la llame. Un `require` normal no expresa "esto tiene que proveerse primero".
3. **Default no-op que ya funciona sin proveedor.** `entitlements.check()` devuelve `true` mientras nadie llamó `provide()`.

Si no compra ninguna de las tres, es solo mover una función detrás de una capa → `core/<nombre>.js` pelado, sin la ceremonia del contrato.

## Excepciones documentadas (copias deliberadas, NO tocar)

Los `toast.js` de `avanzada/` y `movil/` (cada vista legacy conserva el suyo hasta unificar la paleta CSS — ver `plan-fases/06`).
