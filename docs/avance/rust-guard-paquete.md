# Validación local de Rust Chat Guard

Fecha: 2026-10-03. Alcance: paquete local `0.1.0`; no se publicó nada ni se
modificaron `package.json` o `package-lock.json` de TikLiveTTS.

## Paquete local y carga

Se compiló `chatguard-napi` en release desde
`C:\Users\liber\OneDrive\Documentos\.tiklivetts\rust-chat-guard` y se
materializaron los artefactos de su andamiaje npm en un directorio temporal.
Los avisos `THIRD_PARTY_NOTICES.md` viajaron en ambos tarballs.

| Tarball | Contenido | Tamaño comprimido | SHA-1 |
|---|---|---:|---|
| `tiklivetts-rust-chat-guard-win32-x64-msvc-0.1.0.tgz` | `.node`, avisos, manifiesto | 690,5 kB | `c4e96cd0ddb6358b995ee3bfaa326193b79eff38` |
| `tiklivetts-rust-chat-guard-0.1.0.tgz` | loader JS, tipos, avisos, manifiesto | 3,9 kB | `3825d346928575e65f4342bc0b6d6f5df2b026a5` |

Ambos se instalaron con `npm install --no-save --package-lock=false` en un
consumidor temporal externo a ambos repositorios. `load-engine.js` cargó el
paquete real: `apiVersion: 1`, `running: true`, 10 locales por defecto y
`maricón -> BLOCK`.

## Adaptador real

`test/moderacion-rust-guard-real.test.js` es opcional: si
`@tiklivetts/rust-chat-guard` no se resuelve, se omite con un mensaje explícito.
Con el consumidor temporal en `NODE_PATH`, pasaron 2/2 pruebas:

| Caso | Resultado con el motor real |
|---|---|
| Términos | `maricón` y `garchar` -> BLOCK; `año` -> ALLOW; `pvt` -> REVIEW |
| Shadow | Conserva el veredicto JS y registra `moderacion.rust.shadow_bloqueado` |
| Enforce | BLOCK -> `drop`, REVIEW -> `mute`; registra los eventos `moderacion.rust.*` |
| Degradación | `setKillSwitch(true)` devuelve degradado; el adaptador conserva el veredicto JS y registra `moderacion.rust.fallo_evaluacion` |
| Kill switch de TikLiveTTS | `rustGuardEnabled: false` detiene el motor y no lo consulta |
| Cambio de cuenta | Se valida la secuencia que usa `account:changed` (`stop` + `sync`): instancia nueva y palabras de la cuenta anterior eliminadas |
| Palabras del usuario | `palabra-propia` se bloquea tras sincronizar y vuelve a ALLOW al retirarla |

Comando reproducible (sustituir la ruta por un consumidor que contenga los dos
tarballs):

```powershell
$env:NODE_PATH = '<consumidor>\node_modules'
node --test test\moderacion-rust-guard-real.test.js
```

## Latencia observada

En un proceso Node real se calentaron 20.000 llamadas y se midieron 100.000
recorridos de `createRustReviewer` en modo `enforce`, alternando texto limpio y
`maricón`. Incluye el cruce JS -> N-API, la decisión Rust y el endurecimiento
del adaptador; no incluye ingestión de red ni renderizado Electron.

| Muestra | p50 | p99 |
|---|---:|---:|
| 100.000 mensajes | 3,9 µs | 9,7 µs |

## Empaquetado Electron

El cambio que debe aplicarse **cuando el paquete esté publicado** es:

```json
{
  "optionalDependencies": {
    "@tiklivetts/rust-chat-guard": "0.1.0"
  },
  "build": {
    "asarUnpack": [
      "node_modules/@tiklivetts/rust-chat-guard*/**/*.node"
    ]
  }
}
```

Después debe regenerarse y versionarse el lockfile con el registro autorizado.
No se aplicó aquí: una dependencia publicada inexistente rompería `npm ci`.
El paquete raíz usa una `optionalDependency` exacta para la plataforma, por lo
que Windows x64 instala el binario y plataformas no soportadas quedan fail-open.

Se ejecutó `CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --dir`
en una copia temporal física (incluidos los recursos) con ese cambio. El build
generó `win-unpacked/resources/app.asar` (71.423.360 bytes): el loader JS quedó
en el asar y
`chatguard.win32-x64-msvc.node` quedó en
`resources/app.asar.unpacked/node_modules/@tiklivetts/rust-chat-guard-win32-x64-msvc/`.
El binario se cargó desde esa ruta exacta y respondió `running: true`,
`maricón -> BLOCK`.

Pendiente de medir: instalador NSIS en Windows limpio, SmartScreen y otras
plataformas.

## Calidad aplicada

La skill obligatoria `clean-code` no está disponible en este worktree ni en
`C:\Users\liber\.agents\skills`; se aplicaron sus criterios de forma manual.
No hay choque con `AGENTS.md`.

| Archivo | Reglas / smells aplicados |
|---|---|
| `test/moderacion-rust-guard-real.test.js` | Prueba aislada, nombres orientados a comportamiento, helpers mínimos, sin mocks del motor ni abstracciones de un uso |
| `docs/avance/rust-guard-paquete.md` | Evidencia separada de código, límites de medición explícitos, sin afirmar resultados no verificados |
