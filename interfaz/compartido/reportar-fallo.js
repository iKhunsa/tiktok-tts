/**
 * Reporta un fallo REAL de la interfaz (overlay, categorias, explorador, editor) a /api/logs/client.
 * El servidor lo escribe en el log de sesion (se conserva 14 dias); solo `nivel: 'error'` sube ademas
 * a GlitchTip. `warn` = queda para diagnostico pero no genera issue.
 *
 * Regla: reportar lo que NO depende del usuario (servidor caido, 5xx, archivo ilegible, respaldo que no
 * guarda). NO reportar lo que si: archivo muy grande, formato invalido, biblioteca llena, 4xx, cancelar.
 *
 * evento: `interfaz.<overlay|categorias|explorador|editor>.<motivo_en_snake_case>`
 * detalle: valores planos (texto/numero/booleano); nunca nicks, URLs del usuario ni contenido de chat.
 */
const yaReportados = new Set();

export function reportarFallo(evento, mensaje, detalle = {}, nivel = 'error') {
  // Una vez por evento y pagina: un servidor caido no debe disparar un POST por cada clic o sondeo.
  if (yaReportados.has(evento)) return;
  yaReportados.add(evento);
  try {
    fetch('/api/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: mensaje, evento, nivel, detalle, source: /overlay|epik/.test(location.pathname) ? `overlay:${location.pathname}` : 'principal' }),
    }).catch(() => {});
  } catch (_) { /* el reporte nunca debe romper la interfaz */ }
}

/** Solo los fallos del servidor (>= 500) o de red cuentan; un 4xx es una respuesta valida a una accion del usuario. */
export const esFalloServidor = (respuesta) => respuesta.status >= 500;
