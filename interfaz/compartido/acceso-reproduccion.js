import { esDemoTienda } from './vista-previa.js';
import { ESQUEMAS } from './estilo/esquemas.js';
import { ajustesSegunPlan } from './estilo/ajustes-segun-plan.js';
import { esSkinEpik } from './epik/skin-epik.js';

export async function leerAccesoOverlays() {
  try {
    const respuesta = await fetch('/api/overlays/acceso', { cache: 'no-store' });
    if (!respuesta.ok) throw new Error('acceso_no_disponible');
    return await respuesta.json();
  } catch {
    return { pro: false, adquiridas: [], licencias: {}, cuenta: '', disponible: false };
  }
}

/** Resuelve tambien URLs antiguas pegadas en OBS. El plan solo lo decide el servidor. */
export function resolverReproduccion(url, acceso) {
  const parametros = new URL(url).searchParams;
  const tipo = parametros.get('evento') || new URL(url).pathname.match(/overlay-([\w-]+)\.html$/)?.[1];
  if ((tipo === 'escena' || parametros.get('unificado') === '1') && !acceso.pro) return { bloqueado: true };
  if (['chat', 'likes', 'musica'].includes(tipo) && esDemoTienda(parametros) && !esSkinEpik(parametros.get('skin'))) return { bloqueado: false, skin: parametros.get('skin') };
  const esquema = ESQUEMAS[tipo];
  if (!esquema) return { bloqueado: false, skin: parametros.get('skin') };
  const guardado = { skin: parametros.get('skin') || esquema.find((campo) => campo.clave === 'skin')?.def };
  const cfg = ajustesSegunPlan(esquema, guardado, acceso.pro === true, acceso.adquiridas, acceso.licencias);
  if (acceso.disponible === false && esSkinEpik(cfg.skin)) cfg.skin = esquema.find((campo) => campo.clave === 'skin')?.def;
  return { bloqueado: false, skin: cfg.skin };
}

/** Revalida las fuentes abiertas sin necesitar que la UI genere otra URL. */
export async function iniciarReproduccionOverlay(arrancar) {
  const original = new URL(location.href);
  let anterior;
  let iniciado = false;
  async function revisar() {
    const acceso = await leerAccesoOverlays();
    const resuelto = resolverReproduccion(original, acceso);
    const firma = JSON.stringify([resuelto, acceso.cuenta]);
    if (anterior && firma !== anterior && iniciado) {
      document.body.replaceChildren();
      location.replace(original.href);
      return;
    }
    anterior = firma;
    if (resuelto.bloqueado || iniciado) return;
    const efectiva = new URL(original);
    if (resuelto.skin) efectiva.searchParams.set('skin', resuelto.skin);
    window.history.replaceState(null, '', efectiva.href);
    iniciado = true;
    await arrancar();
  }
  await revisar();
  const timer = setInterval(revisar, 3000);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}
