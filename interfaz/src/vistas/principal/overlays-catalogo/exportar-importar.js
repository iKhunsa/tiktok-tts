import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { esCapaGif } from '../../../../compartido/estilo/campos-gif.js';
import { prepararCapaGif } from './gif-capas.js';
import { apiGifs } from '../gif-buscador/api.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';

// Exportar/importar escenas del editor de canvas, para hacer respaldo, llevarlas a otra cuenta o pasarselas a
// otra persona. El archivo es autocontenido: cada capa lleva su ajuste completo (estilo + posicion/tamano de ESA
// escena, ya fusionado) y, si es un GIF o imagen de esta cuenta (no un enlace externo), tambien sus bytes en
// base64 -de otro modo la imagen solo existiria en la computadora de quien exporto.
const FORMATO_APP = 'tiklivetts-escena';
const VERSION = 1;

const slug = (texto) => (texto || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'escena';

/** Ajuste completo de una capa en una escena concreta (no necesariamente la activa): global + override de esa escena. */
const ajustesDeCapa = (escenaObj, id) => ({ ...appSettings.overlays[id], ...(escenaObj.ajustes?.[id] ?? {}) });

async function archivoComoBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return window.btoa(binario);
}

/** Si la capa es gif/imagen: si es un archivo de esta cuenta se embeben sus bytes; si es un enlace externo alcanza con la URL. */
async function medioDeCapa(id, ajustes) {
  if (!esCapaGif(id) || !ajustes.src) return undefined;
  const esLocal = new URL(ajustes.src, location.origin).origin === location.origin;
  if (!esLocal) return { tipo: 'enlace' };
  try {
    const respuesta = await fetch(ajustes.src);
    if (!respuesta.ok) throw new Error('no_encontrado');
    const blob = await respuesta.blob();
    const nombreArchivo = new URL(ajustes.src, location.origin).pathname.split('/').pop() || 'archivo';
    return { tipo: 'local', mime: blob.type || 'application/octet-stream', nombreArchivo, datosBase64: await archivoComoBase64(blob) };
  } catch (_) {
    return { tipo: 'local', advertencia: 'archivo_no_encontrado' };
  }
}

async function capaDeExport(escenaObj, id) {
  const ajustes = ajustesDeCapa(escenaObj, id);
  const medio = await medioDeCapa(id, ajustes);
  return { id, nombreCapa: escenaObj.nombres?.[id], bloqueada: !!escenaObj.bloqueadas?.includes(id), ajustes, ...(medio ? { medio } : {}) };
}

async function escenaDeExport(escenaObj) {
  const capas = await Promise.all((escenaObj.ids ?? []).map((id) => capaDeExport(escenaObj, id)));
  return { nombre: escenaObj.nombre, formato: escenaObj.formato, capas };
}

function descargar(nombreArchivo, datos) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
  Object.assign(document.createElement('a'), { href: url, download: nombreArchivo }).click();
  URL.revokeObjectURL(url);
}

/** @param {number[]|null} indices indices de appSettings.escenas a exportar, o null para todas. */
export async function exportarEscenas(indices) {
  const escenas = (indices ?? appSettings.escenas.map((_, i) => i)).map((i) => appSettings.escenas[i]).filter(Boolean);
  if (!escenas.length) return;
  try {
    const datos = { app: FORMATO_APP, version: VERSION, exportado: Date.now(), escenas: await Promise.all(escenas.map(escenaDeExport)) };
    const unaSola = escenas.length === 1;
    descargar(unaSola ? `tiklivetts-escena-${slug(escenas[0].nombre)}.json` : 'tiklivetts-escenas.json', datos);
    showToast(t(unaSola ? 'overlayCat.editor.exportarHecho' : 'overlayCat.editor.exportarTodasHecho'));
  } catch (_) {
    showToast(t('overlayCat.editor.exportarError'), 'error');
  }
}

/** Decodifica el base64 embebido y lo sube con el mismo endpoint que ya usan Media/Mis GIFs: la cuenta que importa se queda con un recurso propio, nunca con el id/archivo original. */
async function subirArchivoLocal(medio, esMedia) {
  const bytes = Uint8Array.from(window.atob(medio.datosBase64), (c) => c.charCodeAt(0));
  const archivo = new window.File([bytes], medio.nombreArchivo || 'archivo', { type: medio.mime });
  if (esMedia) {
    const formulario = new FormData();
    formulario.append('imagenes', archivo);
    const respuesta = await fetch('/api/imagenes', { method: 'POST', body: formulario });
    const resultado = await respuesta.json();
    if (!respuesta.ok || !resultado.items?.length) throw new Error(resultado.codigo || 'sin_archivo');
    return resultado.items[0];
  }
  const { items } = await apiGifs.subir([archivo]);
  if (!items?.length) throw new Error('sin_archivo');
  return items[0];
}

/** Enlace externo permanente: no hay bytes que subir, se registra la URL en la biblioteca de la cuenta que importa. */
async function importarEnlaceGif(url, titulo) {
  const respuesta = await fetch('/api/gifs/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, titulo }) });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw Object.assign(new Error(datos.error || 'error'), { codigo: datos.codigo });
  return datos.item;
}

/** Recrea una capa gif/imagen en la cuenta que importa y devuelve su id nuevo. Lanza si no se pudo (sin bytes, enlace muerto...). */
async function remaparCapaGif(capa) {
  const esMedia = capa.id.startsWith('gif:m');
  let item;
  if (!esMedia && capa.medio?.tipo === 'enlace') item = await importarEnlaceGif(capa.ajustes.src, capa.nombreCapa || 'GIF');
  else {
    if (capa.medio?.tipo !== 'local' || !capa.medio.datosBase64) throw new Error('sin_archivo');
    item = await subirArchivoLocal(capa.medio, esMedia);
  }
  const idNuevo = esMedia ? `gif:m${item.id}` : `gif:${item.id}`;
  const srcNuevo = new URL(item.src, location.origin).href;
  prepararCapaGif(idNuevo, srcNuevo);
  Object.assign(appSettings.overlays[idNuevo], capa.ajustes, { src: srcNuevo });
  return idNuevo;
}

// Si ya existe una escena con el mismo nombre, se distingue (mismo criterio que "Duplicar", que usa " (2)").
function nombreEscenaLibre(nombre) {
  if (!nombre) return nombre;
  return appSettings.escenas.some((e) => (e.nombre || '') === nombre) ? `${nombre} (import)` : nombre;
}

async function importarEscenaDatos(escenaDatos) {
  const ids = [];
  const nombres = {};
  const bloqueadas = [];
  const ajustes = {};
  let omitidas = 0;
  for (const capa of escenaDatos.capas ?? []) {
    try {
      let id = capa.id;
      if (esCapaGif(id)) {
        id = await remaparCapaGif(capa);
        ajustes[id] = appSettings.overlays[id];
      } else if (ESQUEMAS[id]) {
        ajustes[id] = capa.ajustes;
      } else {
        omitidas += 1;
        continue;
      }
      ids.push(id);
      if (capa.nombreCapa) nombres[id] = capa.nombreCapa;
      if (capa.bloqueada) bloqueadas.push(id);
    } catch (_) {
      omitidas += 1;
    }
  }
  appSettings.escenas.push({
    id: window.crypto.randomUUID().slice(0, 8), nombre: nombreEscenaLibre(escenaDatos.nombre) || '',
    ids, nombres, bloqueadas, formato: escenaDatos.formato, ajustes,
  });
  return { capas: ids.length, omitidas };
}

/** Importa un archivo exportado con exportarEscenas. Siempre aditivo: agrega escena(s) nuevas, nunca toca las que ya existen ni los ajustes globales. */
export async function importarArchivo(file) {
  let datos;
  try { datos = JSON.parse(await file.text()); } catch (_) { datos = null; }
  if (datos?.app !== FORMATO_APP || !Array.isArray(datos.escenas) || !datos.escenas.length) {
    showToast(t('overlayCat.editor.importarFormatoInvalido'), 'error');
    return false;
  }
  try {
    let capas = 0;
    let omitidas = 0;
    for (const escenaDatos of datos.escenas) {
      const resultado = await importarEscenaDatos(escenaDatos);
      capas += resultado.capas;
      omitidas += resultado.omitidas;
    }
    saveSettings();
    showToast(t('overlayCat.editor.importarHecho', { escenas: datos.escenas.length, capas, omitidas }));
    return true;
  } catch (_) {
    showToast(t('overlayCat.editor.importarError'), 'error');
    return false;
  }
}
