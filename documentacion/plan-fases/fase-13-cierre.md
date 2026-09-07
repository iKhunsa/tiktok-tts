# Fase 13 — Cierre

## Objetivo
Confirmar paridad total de comportamiento contra el backend viejo, actualizar la documentación del proyecto a la arquitectura nueva, y eliminar `backend-viejo/` definitivamente.

## Referencia obligatoria
- Los tres documentos de diseño (`mapa-funciones-actual.md`, `arquitectura-propuesta.md`, `logging-errores-propuesta.md`) se usan acá como checklist final, no como referencia de implementación (eso ya pasó en las Fases 1-12).
- `CLAUDE.md` (raíz del proyecto) — su sección "Arquitectura" actual describe el monolito (`main.js` → `server.js` → Express+WS en un solo proceso) y tiene que reescribirse para reflejar la estructura por dominios.

## Paso a paso

### 1. Checklist de paridad función por función
Recorrer `mapa-funciones-actual.md` dominio por dominio (Chat, Overlay, Clips, Sonido, Movil, Bot, Moderacion, Configuracion, Donar, Canales, Avanzado, Reporte-bug, Idioma, Sin clasificar/infraestructura) y confirmar que cada función listada tiene un equivalente identificable en el backend nuevo — salvo las marcadas explícitamente como no-op en su fase correspondiente (ej. `/donar`, Fase 12). Marcar cualquier función que haya quedado sin migrar y decidir explícitamente: ¿se migra ahora, o se documenta como descartada a propósito (y por qué)?

### 2. Auditoría final de logging
Aplicar el "Checklist de migración" que ya está al final de `logging-errores-propuesta.md`:
1. Confirmar que la firma nueva de `log()` (con `event` obligatorio) se usa en el 100% de las ~160 llamadas migradas a lo largo de las Fases 1-12 — grep de cualquier resto de la firma vieja (`log(level, ctx, msg, data)` sin `event`).
2. Revisar cada `catch` marcado como "silencioso a propósito" durante las fases (ej. desconexiones best-effort en shutdown) — confirmar que lleva su comentario `// silencioso: <razón>` y que los que NO son best-effort real quedaron logueados.
3. Confirmar que ningún log de config completa sobrevivió la migración (grep de `JSON.stringify(config)`/`log(..., config)` pasando el objeto entero) — el hallazgo de fuga de `adminIdentities` no debe reaparecer en ningún dominio nuevo.
4. Confirmar que `core/logger.js` (Fase 1) sigue siendo el único punto que toca `console.*` en todo el repo nuevo (`grep -rn "console\." --include=*.js .` excluyendo `backend-viejo/`, `node_modules/`, y el fallback de última instancia dentro de `core/logger.js` mismo).

### 3. Actualizar CLAUDE.md
Reemplazar la sección "Arquitectura" del `CLAUDE.md` del proyecto: quitar el diagrama del monolito `main.js`/`server.js` y describir la estructura nueva por dominios (referenciar `arquitectura-propuesta.md` como el documento vivo de arquitectura, o volcar su contenido resumido directo en `CLAUDE.md` si se prefiere que quede todo en un solo lugar). Actualizar también cualquier mención a rutas de archivo que ya no existen en la raíz (`server.js`, `main.js`, `moderation-store.js`, `music-engine.js` ya no están ahí, viven repartidos por dominio).

### 4. Borrar backend-viejo/
Solo después de que los pasos 1-3 estén completos y confirmados:
```bash
git rm -r backend-viejo/
```
Commit dedicado, mensaje que referencie que el rebuild por dominios (Fases 0-13) está completo y verificado.

### 5. Limpieza de artefactos de plan
Evaluar con el usuario si `plan-fases/`, `mapa-funciones-actual.md`, `arquitectura-propuesta.md`, `logging-errores-propuesta.md` se quedan en el repo como documentación histórica/de referencia continua, se mueven a una carpeta `docs/`, o se eliminan una vez que `CLAUDE.md` ya absorbió lo esencial. No decidir esto unilateralmente — son documentos de diseño que el usuario pidió explícitamente, su destino final es decisión suya.

## Criterios de aceptación
1. Checklist de paridad (paso 1) sin ninguna función pendiente sin decisión explícita.
2. `npm run build:electron` sigue generando un instalador funcional después de borrar `backend-viejo/` (confirma que de verdad no queda ninguna referencia activa).
3. `grep -rn "backend-viejo" .` (excluyendo `.git/`) da cero resultados tras el paso 4.
4. `CLAUDE.md` actualizado, revisado por el usuario.

## Riesgos
- El paso más irreversible de todo el plan (`git rm -r backend-viejo/`) — confirmar explícitamente con el usuario antes de ejecutarlo, aunque el historial de git lo recupera, es una acción destructiva sobre el árbol de trabajo que amerita una confirmación aparte en el momento, no asumida de antemano por este documento.
