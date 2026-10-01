# Arreglos de audio TTS

## Cambios

- Al expirar o fallar `audio.play()`, el audio se pausa, pierde sus handlers, vacía su fuente y libera su URL antes de continuar la cola.
- El máximo efectivo de TTS es 200: default, validador y slider coinciden. Las configuraciones guardadas con un valor mayor se acotan al cargarse.

## Verificación

| Comando | Resultado |
| --- | --- |
| `node --test test/tts-audio-stop.test.js test/config-tts-max-chars.test.js` | 2/2 verdes |
| `npx vite build --config interfaz/vite.config.js` | correcto |
| `npm test` | 198/198 verdes |
| `npx eslint .` | 0 errores nuevos; warnings existentes |

## Clean Code aplicado

| Archivo | Reglas/smells aplicados |
| --- | --- |
| `interfaz/src/nucleo/tts/stop-audio.js` | F3/G30: una operación con responsabilidad única; G5: elimina la duplicación de descarte. |
| `interfaz/src/nucleo/tts/cola-tts.js` | G5/G17: reutiliza el descarte en todos los caminos de fallo; G3: cubre timeout y rechazo tardío de `play()`. |
| `features/configuracion/default-config.js` | G25/G11: límite coherente con el contrato efectivo de TTS. |
| `features/configuracion/validators.js` | G3/G26: valida el límite real en el boundary de entrada. |
| `features/configuracion/store.js` | G3/G22: normaliza configuración legacy al cargarla, antes de aplicarla. |
| `interfaz/advanced.html` | G11: rango y valor inicial reflejan el límite de servidor. |
| `test/tts-audio-stop.test.js` | T1/F.I.R.S.T.: prueba rápida, aislada y autocontenida del descarte. |
| `test/config-tts-max-chars.test.js` | T1/G3: cubre rechazo del límite nuevo y migración de configuración antigua. |
| `docs/avance/tts-audio.md` | C4: documentación concisa y vigente de cambio y verificación. |

Conflictos con reglas de la skill: ninguno.

FIN-T
