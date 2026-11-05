import { leerConfig } from '../estilo/query.js';
import { ESQUEMAS } from '../estilo/esquemas.js';
import { cargarLocaleOverlay, idiomaOverlay, t } from '../i18n-overlay.js';
import { leerParametros } from '../parametros.js';
import { esVistaPrevia } from '../vista-previa.js';
import { iniciarAccesibilidadOverlay } from '../accesibilidad.js';
import { registrarErroresOverlay } from '../registrar-errores.js';
import { esquemaEpik, esSkinEpik, idDeSkin } from './skin-epik.js';

const MAX_PENDIENTES = 200;

/** Entrada de un overlay de la app: con skin `epik:<id>` monta el .epik, si no el overlay de siempre. */
export const elegirEntrada = ({ nativo, epik }) => (esSkinEpik(new URLSearchParams(location.search).get('skin')) ? epik() : nativo());

/**
 * Lo comun de cada anfitrion de familia: config del overlay, textos traducidos, montar el .epik y la
 * accesibilidad. Si el paquete falta o esta roto arranca el overlay de siempre (`nativo`) y devuelve null.
 * textos: (t) => ({ clave: texto traducido }).
 */
export async function prepararEpik({ familia, overlay, textos = () => ({}), nativo }) {
  registrarErroresOverlay();
  const params = leerParametros();
  const cfg = leerConfig(ESQUEMAS[overlay], params);
  await cargarLocaleOverlay();
  const epik = await montarEpik({ id: idDeSkin(cfg.skin), tipo: familia, overlay, cfgBase: cfg, textos: textos(t), params });
  if (!epik) {
    nativo();
    return null;
  }
  // alConfig: para el `config-updated` del WS (la app cambio la accesibilidad en caliente).
  const alConfig = iniciarAccesibilidadOverlay((movimientoReducido) => epik.enviar('a11y', { movimientoReducido }));
  return { ...epik, cfg, vistaPrevia: esVistaPrevia(params), params, alConfig };
}

/**
 * Monta un overlay .epik dentro del overlay de la app. El diseno corre en un iframe con
 * sandbox (sin red, sin la API de la app, origen opaco): solo recibe por postMessage los
 * datos de su familia de overlay. Protocolo v1: { epik: 1, tipo, datos }.
 * `tipo` es la familia (manifest.overlay) y `overlay` el overlay concreto que lo usa (likes, donadores...).
 * Devuelve { enviar(tipo, datos) } o null si el paquete no se pudo leer.
 */
export async function montarEpik({ id, tipo, overlay = tipo, cfgBase, textos, params }) {
  const base = `/epik/${id}/`;
  let manifest;
  try {
    manifest = await fetch(`${base}manifest.json`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  } catch {
    return null;
  }
  if (manifest.overlay !== tipo) return null;

  const propios = leerConfig(esquemaEpik(manifest.campos), params);
  const config = { tipo, overlay, idioma: idiomaOverlay(), medida: manifest.medida, ...cfgBase, ...propios };

  const marco = document.createElement('iframe');
  // color-scheme igual al del documento del diseno: si difieren, el navegador pinta el iframe opaco (blanco).
  marco.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent;color-scheme:normal;';
  marco.title = manifest.nombre || id;
  marco.setAttribute('sandbox', 'allow-scripts');
  marco.setAttribute('allow', 'autoplay');
  marco.src = `${base}${manifest.entrada || 'index.html'}`;
  document.body.replaceChildren(marco);

  // Hasta el primer `listo` se guarda todo en orden (mensajes de chat que llegan juntos); si el diseno se
  // recarga despues, se le reenvia lo ultimo de cada tipo.
  const ultimo = new Map();
  let pendientes = [];
  let listo = false;
  const mandar = (mensaje) => marco.contentWindow?.postMessage(mensaje, '*'); // origen opaco: no hay otro destino posible
  const enviar = (tipoMensaje, datos) => {
    const mensaje = { epik: 1, tipo: tipoMensaje, datos };
    ultimo.set(tipoMensaje, mensaje);
    if (listo) mandar(mensaje);
    else if (pendientes.push(mensaje) > MAX_PENDIENTES) pendientes.shift();
  };

  window.addEventListener('message', ({ source, data }) => {
    if (source !== marco.contentWindow || data?.epik !== 1 || data.tipo !== 'listo') return;
    mandar({ epik: 1, tipo: 'config', datos: { config, textos } });
    (listo ? [...ultimo.values()] : pendientes).forEach(mandar);
    listo = true;
    pendientes = [];
  });
  return { enviar };
}
