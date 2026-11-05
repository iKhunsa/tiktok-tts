import { conectarWSOverlay } from './ws-cliente.js';
import { crearCreditos } from './creditos-agregados.js';
import { MUESTRA_CREDITOS } from './muestras-vista-previa.js';
import { etiquetaRegalo } from './recurso-plataforma.js';

/** Lo que regalo un donante, en una linea. Bits y Kicks ya dicen su cantidad; el resto se cuenta por repeticiones. */
export function textoRegalos(t, donante) {
  return [...donante.regalos].map(([giftName, veces]) => {
    const tipo = donante.tipos.get(giftName);
    const texto = etiquetaRegalo(t, { giftName, ...tipo });
    return tipo && tipo.kind !== 'sub' ? texto : `x${veces} ${texto}`;
  }).join(', ');
}

/**
 * Donantes, seguidores y compartidos del directo (agregados por usuario), comun al overlay de creditos y a
 * los .epik de creditos y social. alCambio(creditos, inicial): la carga inicial y cada evento nuevo.
 * alConfig(config): cambio de ajustes de la app.
 */
export async function iniciarFuenteCreditos({ vistaPrevia, alCambio, alConfig }) {
  const creditos = crearCreditos();
  // Vista previa: sin eventos reales se cargan donantes, seguidores y compartidos de ejemplo.
  const cargarMuestra = () => {
    if (!vistaPrevia || creditos.donors.length || creditos.followers.length || creditos.sharers.length) return;
    MUESTRA_CREDITOS.donantes.forEach(creditos.agregarDonante);
    MUESTRA_CREDITOS.donantesPlataformas.forEach(creditos.agregarDonante);
    MUESTRA_CREDITOS.seguidores.forEach(creditos.agregarSeguidor);
    MUESTRA_CREDITOS.compartidos.forEach(creditos.agregarSharer);
  };

  try {
    const estadisticas = await (await fetch('/api/overlay-stats')).json();
    if (estadisticas.credits) creditos.cargar(estadisticas.credits);
  } catch { /* sin datos: arranca vacio */ }
  cargarMuestra();
  alCambio(creditos, true);

  conectarWSOverlay((d) => {
    if (d.type === 'gift') creditos.agregarDonante({ user: d.user, giftName: d.giftName || d.kind, count: d.repeatCount || 1, platform: d.platform, kind: d.kind, amount: d.amount });
    else if (d.type === 'follow') creditos.agregarSeguidor({ user: d.user, platform: d.platform, avatar: d.avatar });
    else if (d.type === 'share') creditos.agregarSharer({ user: d.user, platform: d.platform, avatar: d.avatar });
    else if (d.type === 'connected' && d.isFirst) { creditos.vaciar(); cargarMuestra(); } else {
      if (d.type === 'config-updated') alConfig(d.config || {});
      return;
    }
    alCambio(creditos, false);
  });
}
