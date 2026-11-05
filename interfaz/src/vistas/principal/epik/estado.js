import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { construirQuery, valoresPorDefecto } from '../../../../compartido/estilo/query.js';
import { esquemaEpik, idDeSkin } from '../../../../compartido/epik/skin-epik.js';

/**
 * Archivos .epik instalados en la cuenta (los guarda el servidor, features/epik/).
 * Los ajustes propios de cada uno van en appSettings.epik[id]: por id, asi sobreviven
 * a una version nueva del archivo y a quitarlo y volver a importarlo.
 */
// Familias: { musica: ['musica'], ranking: ['likes', 'donadores'], ... }. Un .epik declara su familia
// (`epik.overlay`) y sirve en todos los overlays de ella.
let familias = {};
let epiks = [];
const oyentes = new Set();

const familiaDe = (overlay) => Object.keys(familias).find((familia) => familias[familia].includes(overlay)) || null;
export const aceptaEpik = (overlay) => !!familiaDe(overlay);
export const overlaysDe = (familia) => familias[familia] || [];
export const epiksDe = (overlay) => epiks.filter((epik) => epik.overlay === familiaDe(overlay));
export const epikPorId = (id) => epiks.find((epik) => epik.id === id);
export const alCambiarEpiks = (fn) => oyentes.add(fn);
const avisar = () => oyentes.forEach((fn) => fn());

// Favoritos: todos lo son al importarse; quitarlo solo lo saca del selector de skins (no lo borra).
export const esFavorito = (id) => !appSettings.epikOcultos.includes(id);
export const favoritosDe = (overlay) => epiksDe(overlay).filter((epik) => esFavorito(epik.id));
export function alternarFavorito(id) {
  appSettings.epikOcultos = esFavorito(id) ? [...appSettings.epikOcultos, id] : appSettings.epikOcultos.filter((otro) => otro !== id);
  saveSettings();
  avisar();
}

export async function cargarEpiks() {
  try {
    const datos = await fetch('/api/epik').then((r) => r.json());
    familias = datos.familias || {};
    epiks = datos.epiks || [];
  } catch {
    return; // sin servidor se queda lo que habia; la seccion se ve vacia
  }
  avisar();
}

/** Sube el archivo; devuelve la respuesta del servidor con `ok` y `status`. */
export async function importarEpik(archivo, overlay) {
  const res = await fetch(`/api/epik/importar?overlay=${encodeURIComponent(overlay)}`, { method: 'POST', body: archivo });
  const datos = await res.json().catch(() => ({}));
  if (res.ok) await cargarEpiks();
  return { ...datos, ok: res.ok, status: res.status };
}

/** Borra un .epik importado de la cuenta (las plantillas de la app no se eliminan: 403). Sus ajustes propios se conservan por id. */
export async function eliminarEpik(id) {
  const res = await fetch(`/api/epik/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const datos = await res.json().catch(() => ({}));
  if (res.ok) await cargarEpiks();
  return { ...datos, ok: res.ok };
}

/** Guarda una plantilla de la app en la carpeta Descargas (las plantillas no se eliminan). */
export async function descargarPlantilla(id) {
  const res = await fetch(`/api/epik/${encodeURIComponent(id)}/descargar`, { method: 'POST' });
  const datos = await res.json().catch(() => ({}));
  return { ...datos, ok: res.ok };
}

export function ajustesEpik(id) {
  appSettings.epik[id] ??= {};
  return appSettings.epik[id];
}

export function guardarAjusteEpik(id, clave, valor) {
  ajustesEpik(id)[clave] = valor;
  saveSettings();
}

export function restablecerAjustesEpik(id) {
  appSettings.epik[id] = {};
  saveSettings();
}

/** El .epik que usa ahora un overlay (su skin es `epik:<id>` y sigue instalado), o null. */
export const epikActivo = (overlay) => epikPorId(idDeSkin(appSettings.overlays?.[overlay]?.skin)) || null;

/** Ajustes propios del .epik activo para la URL del overlay (`x.<clave>`, solo lo que difiere). */
export function queryEpik(overlay) {
  const epik = epikActivo(overlay);
  if (!epik) return '';
  return construirQuery(esquemaEpik(epik.campos), { ...valoresPorDefecto(epik.campos), ...ajustesEpik(epik.id) });
}
