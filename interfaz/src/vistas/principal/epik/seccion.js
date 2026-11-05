import { t, tErr, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { appSettings } from '../../../nucleo/estado/ajustes-app.js';
import { showToast } from '../../../componentes/toast.js';
import { skinDeEpik } from '../../../../compartido/epik/skin-epik.js';
import { DEFAULTS_OVERLAYS } from '../../../../compartido/estilo/esquemas.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { sincronizarCamposOverlay } from '../campos-overlay/sincronizar.js';
import { ponerSkin } from '../campos-overlay/index.js';
import { aceptaEpik, overlaysDe, alCambiarEpiks, alternarFavorito, cargarEpiks, descargarPlantilla, eliminarEpik, epikActivo, epiksDe, esFavorito, importarEpik } from './estado.js';
import { crearAjustesEpik } from './campos-epik.js';
import { abrirPopupOtroOverlay } from './popup-otro-overlay.js';

const abiertas = new Set(); // overlays con la seccion desplegada: se conserva al redibujar
const EXTENSION = '.epik';
const CONFIRMAR_MS = 4000; // tiempo para el segundo clic de «¿Eliminar?» antes de volver al icono

// Lo comparten soltar el archivo en el acordeon y el doble clic (proceso principal, ver alAbrirEpik).
function mostrarResultado(respuesta, { overlay, reintentar } = {}) {
  if (respuesta.ok) {
    const { epik, actualizado } = respuesta;
    showToast(actualizado ? t('overlayCfg.epik.actualizado', { nombre: epik.nombre, version: epik.version }) : t('overlayCfg.epik.importado', { nombre: epik.nombre }));
    // Lo agregaron para usarlo: en el acordeon donde lo soltaron o, con doble clic, en el primero de su familia.
    if (!actualizado && appSettings.overlays) ponerSkin(overlay || overlaysDe(epik.overlay)[0], skinDeEpik(epik.id));
    return;
  }
  if (respuesta.status === 409 && reintentar) {
    abrirPopupOtroOverlay({ nombre: respuesta.nombre, origen: overlay, destino: respuesta.overlay, alAgregar: () => reintentar(respuesta.overlay) });
    return;
  }
  showToast(tErr(respuesta, 'errors.epikInvalido'));
}

async function importar(archivo, overlay, zona) {
  if (!archivo.name.toLowerCase().endsWith(EXTENSION)) return showToast(t('overlayCfg.epik.noEpik'));
  zona?.classList.add('importando');
  const respuesta = await importarEpik(archivo, overlay).catch(() => ({ ok: false }));
  zona?.classList.remove('importando');
  mostrarResultado(respuesta, { overlay, reintentar: (destino) => importar(archivo, destino) });
}

/** .epik abierto con doble clic: ya lo importo el proceso principal (a su propio overlay); aqui solo se muestra y se usa. */
export async function alAbrirEpik(respuesta) {
  if (respuesta.ok) await cargarEpiks(); // la skin nueva necesita estar en la lista para sumar sus ajustes a la URL
  mostrarResultado(respuesta);
}

async function descargar(epik) {
  const respuesta = await descargarPlantilla(epik.id).catch(() => ({ ok: false }));
  showToast(respuesta.ok ? t('overlayCfg.epik.descargado', { archivo: respuesta.archivo }) : tErr(respuesta, 'errors.epikNoEncontrado'));
}

// Los overlays de su familia que lo tenian puesto vuelven a su skin de fabrica.
async function eliminar(epik) {
  const skin = skinDeEpik(epik.id);
  const enUso = overlaysDe(epik.overlay).filter((overlay) => appSettings.overlays?.[overlay]?.skin === skin);
  const respuesta = await eliminarEpik(epik.id).catch(() => ({ ok: false }));
  if (!respuesta.ok) return showToast(tErr(respuesta, 'errors.epikNoEncontrado'));
  enUso.forEach((overlay) => ponerSkin(overlay, DEFAULTS_OVERLAYS[overlay].skin));
  showToast(t('overlayCfg.epik.eliminado', { nombre: epik.nombre }));
}

/** Borrar no se deshace: el primer clic convierte el icono en «¿Eliminar?» y el segundo lo borra. */
function crearBotonEliminar(epik) {
  const boton = crearBotonIcono('delete', 'overlayCfg.epik.eliminar', () => {
    if (boton.classList.contains('confirmando')) {
      boton.disabled = true;
      eliminar(epik).finally(() => { boton.disabled = false; });
      return;
    }
    boton.classList.add('confirmando');
    boton.textContent = t('overlayCfg.epik.confirmarEliminar');
    setTimeout(volver, CONFIRMAR_MS);
  });
  boton.classList.add('epik-eliminar');
  const icono = boton.innerHTML;
  const volver = () => {
    if (!boton.classList.contains('confirmando')) return;
    boton.classList.remove('confirmando');
    boton.innerHTML = icono;
  };
  boton.addEventListener('blur', volver);
  return boton;
}

// Textos fijos por data-i18n: se retraducen solos aunque la seccion se monte antes de cargar el idioma.
function crearBotonIcono(icono, clave, alPulsar) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'epik-icono';
  boton.dataset.i18nTitle = clave;
  boton.dataset.i18nAriaLabel = clave;
  boton.innerHTML = `<img class="icon-inline" src="icons/${icono}.svg" alt="">`;
  boton.addEventListener('click', alPulsar);
  return boton;
}

function crearZona(overlay) {
  const zona = document.createElement('label');
  zona.className = 'epik-zona';
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = EXTENSION;
  entrada.hidden = true;
  const icono = document.createElement('img');
  icono.className = 'icon-inline';
  icono.src = 'icons/upload.svg';
  icono.alt = '';
  const texto = document.createElement('strong');
  texto.dataset.i18n = 'overlayCfg.epik.soltar';
  const ayuda = document.createElement('small');
  ayuda.dataset.i18n = 'overlayCfg.epik.soltarAyuda';
  zona.append(entrada, icono, texto, ayuda);

  entrada.addEventListener('change', () => {
    if (entrada.files[0]) importar(entrada.files[0], overlay, zona);
    entrada.value = '';
  });
  zona.addEventListener('dragover', (evento) => { evento.preventDefault(); zona.classList.add('encima'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('encima'));
  zona.addEventListener('drop', (evento) => {
    evento.preventDefault();
    zona.classList.remove('encima');
    const [archivo] = evento.dataTransfer.files;
    if (archivo) importar(archivo, overlay, zona);
  });
  return zona;
}

function crearItem(epik, overlay) {
  const item = document.createElement('li');
  item.className = 'epik-item';
  const miniatura = document.createElement(epik.preview ? 'img' : 'span');
  miniatura.className = 'epik-mini';
  if (epik.preview) { miniatura.src = epik.preview; miniatura.alt = ''; }
  const info = document.createElement('div');
  info.className = 'epik-info';
  const nombre = document.createElement('b');
  nombre.textContent = epik.nombre;
  const detalle = document.createElement('small');
  detalle.textContent = `v${epik.version} · ${epik.autor}`;
  info.append(nombre, detalle);

  // data-cfg-fija: campos-overlay lo guarda como cualquier skin y sincronizar.js marca el que esta en uso.
  const usar = document.createElement('button');
  usar.type = 'button';
  usar.className = 'epik-usar';
  usar.dataset.cfgOverlay = overlay;
  usar.dataset.cfgFija = JSON.stringify({ skin: skinDeEpik(epik.id) });
  usar.dataset.i18n = 'overlayCfg.epik.usar';

  // La estrella lo saca o lo vuelve a poner en el selector de skins sin borrarlo.
  const favorito = esFavorito(epik.id);
  const estrella = crearBotonIcono(favorito ? 'star' : 'star_border', favorito ? 'overlayCfg.epik.quitarFavorito' : 'overlayCfg.epik.agregarFavorito', () => alternarFavorito(epik.id));
  estrella.setAttribute('aria-pressed', String(favorito));
  item.append(miniatura, info, usar, estrella);
  // Las plantillas viajan con la app: no se eliminan, se descargan para partir de ellas. Lo importado si se elimina.
  item.append(epik.integrado ? crearBotonIcono('download', 'overlayCfg.epik.descargar', () => descargar(epik)) : crearBotonEliminar(epik));
  return item;
}

/** Ultimo acordeon de un overlay: soltar archivos .epik, la lista instalada y los ajustes del que este en uso. */
export function montarSeccionEpik(overlay) {
  const panel = document.querySelector(`[data-campos-panel="${overlay}"]`);
  panel?.querySelector(':scope > .cfg-epik')?.remove();
  if (!panel || !aceptaEpik(overlay)) return;

  const seccion = document.createElement('details');
  seccion.className = 'cfg-grupo cfg-epik';
  seccion.open = abiertas.has(overlay);
  seccion.addEventListener('toggle', () => (seccion.open ? abiertas.add(overlay) : abiertas.delete(overlay)));
  const titulo = document.createElement('summary');
  titulo.className = 'cfg-grupo-titulo';
  titulo.dataset.i18n = 'overlayCfg.epik.titulo';

  const cuerpo = document.createElement('div');
  cuerpo.className = 'epik-cuerpo';
  const instalados = epiksDe(overlay);
  cuerpo.append(crearZona(overlay));
  if (instalados.length) {
    const lista = document.createElement('ul');
    lista.className = 'epik-lista';
    lista.append(...instalados.map((epik) => crearItem(epik, overlay)));
    cuerpo.append(lista);
  }
  const activo = epikActivo(overlay);
  if (activo) cuerpo.append(crearAjustesEpik(activo, overlay, () => montarSeccionEpik(overlay)));

  seccion.append(titulo, cuerpo);
  panel.append(seccion);
  aplicarTraducciones(seccion);
  sincronizarCamposOverlay(overlay); // marca el boton Usar del que esta en uso
}

/** Carga los .epik de la cuenta y redibuja al cambiar (importar, quitar, o desde el MCP via WS epik-changed). */
export function iniciarEpik() {
  alCambiarEpiks(() => {
    if (!appSettings.overlays) return; // aun sin ajustes de la cuenta: los campos se dibujan despues y montan la seccion
    Object.keys(appSettings.overlays).filter(aceptaEpik).forEach((overlay) => {
      montarSeccionEpik(overlay);
      updateOverlayUrl(overlay); // la URL suma los ajustes propios del .epik en uso
    });
  });
  cargarEpiks();
}

