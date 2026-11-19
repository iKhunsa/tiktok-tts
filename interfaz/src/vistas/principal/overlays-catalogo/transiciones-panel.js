import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { paintRangeFill } from '../../../componentes/campos-formulario.js';
import { avisarErrorMedia, subirMedia } from './media-api.js';
import { abrirSelectorMedia } from './media-selector-ventana.js';
import { DURACION_TRANSICION, STINGER_PUNTO, TIPOS_ESPECIALES, TIPOS_MASCARA, TIPOS_MOVIMIENTO, TRANSICION_POR_DEFECTO, transicionar } from '../../../../compartido/transiciones-escena.js';

const NINGUNA = 'ninguna';
const CLAVE = 'overlayCat.editor';
const claveDe = (tipo) => (tipo === NINGUNA ? `${CLAVE}.transicionNinguna` : `${CLAVE}.transicion_${tipo}`);
// Tipos con los que el sentido de la animacion no cambia nada: no tiene sentido ofrecer "invertir".
const SIN_INVERTIR = [NINGUNA, ...TIPOS_ESPECIALES];

const panel = () => document.getElementById('ovlEditorTransiciones');
const transicion = () => {
  const ajustes = (appSettings.transicionEscena ??= {});
  return Object.assign(ajustes, { ...TRANSICION_POR_DEFECTO, ...ajustes, stinger: { ...TRANSICION_POR_DEFECTO.stinger, ...ajustes.stinger } });
};
let guardarStinger = () => {}; // lo define iniciarPanelTransiciones (comparte `guardar` con el resto de los campos)
const campo = (nombre) => panel().querySelector(`[data-campo="${nombre}"]`);
const opciones = (tipos) => tipos.map((tipo) => `<option value="${tipo}" data-i18n="${claveDe(tipo)}"></option>`).join('');

/** Pinta el estado guardado y muestra solo los campos que usa el tipo elegido. */
export function refrescarPanelTransiciones() {
  const { tipo, duracion, invertir, color, stinger } = transicion();
  campo('tipo').value = tipo;
  campo('duracion').value = String(duracion);
  campo('duracion').disabled = tipo === NINGUNA;
  paintRangeFill(campo('duracion'));
  panel().querySelector('[data-valor="duracion"]').textContent = `${(duracion / 1000).toFixed(2)} s`;
  campo('invertir').checked = invertir;
  panel().querySelector('[data-grupo="invertir"]').hidden = SIN_INVERTIR.includes(tipo);
  campo('color').value = color;
  panel().querySelector('[data-grupo="color"]').hidden = tipo !== 'color';
  panel().querySelectorAll('[data-grupo="stinger"]').forEach((grupo) => { grupo.hidden = tipo !== 'stinger'; });
  campo('stingerSrc').value = stinger.src;
  pintarEleccionStinger(stinger.src);
  campo('stingerPunto').value = String(stinger.punto);
  paintRangeFill(campo('stingerPunto'));
  panel().querySelector('[data-valor="stingerPunto"]').textContent = `${stinger.punto}%`;
  panel().querySelector('[data-probar]').disabled = tipo === NINGUNA || (tipo === 'stinger' && !stinger.src);
}

const esVideo = (src) => /\.(mp4|webm)(?:$|[?#])/i.test(src);

/**
 * Stinger elegido: su vista previa y las acciones con el aspecto de "GIF de la alerta": elegir de tu biblioteca Media
 * (ventana emergente), subir una imagen nueva directamente desde aqui, o quitarla. Los videos se pegan como URL.
 */
function pintarEleccionStinger(src) {
  const fila = panel().querySelector('[data-stinger-eleccion]');
  const boton = (clase, contenido, alPulsar) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = clase;
    el.innerHTML = contenido;
    el.addEventListener('click', alPulsar);
    return el;
  };
  const elegir = boton('edi-gif-alerta-elegir', `<span data-i18n="${CLAVE}.transicionStingerMedia"></span>`, () => abrirSelectorMedia({ actual: src, alElegir: (nueva) => guardarStinger({ src: nueva }) }));
  const subir = boton('cfg-btn edi-transicion-subir', `<img class="icon-inline" src="icons/add.svg" alt=""> <span data-i18n="${CLAVE}.mediaSubir"></span>`, () => fila.querySelector('input[type="file"]').click());
  const archivo = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true });
  archivo.addEventListener('change', async () => {
    const elegido = archivo.files[0];
    archivo.value = '';
    if (!elegido) return;
    try {
      const [subida] = await subirMedia([elegido]);
      if (subida) guardarStinger({ src: subida.src });
    } catch (error) { avisarErrorMedia(error.codigo); }
  });
  const acciones = document.createElement('div');
  acciones.className = 'edi-gif-alerta-acciones';
  acciones.append(elegir);
  if (src) {
    const quitar = boton('edi-gif-alerta-quitar', '<img class="icon-inline" src="icons/delete.svg" alt="">', () => guardarStinger({ src: '' }));
    quitar.title = t('gifs.alerta.quitar');
    quitar.setAttribute('aria-label', t('gifs.alerta.quitar'));
    acciones.append(quitar);
  }
  const vista = src ? Object.assign(document.createElement(esVideo(src) ? 'video' : 'img'), { className: 'edi-gif-alerta-actual', src }) : null;
  if (vista && esVideo(src)) Object.assign(vista, { muted: true, loop: true, autoplay: true, playsInline: true });
  else if (vista) vista.alt = '';
  fila.replaceChildren(...(vista ? [vista] : []), acciones, subir, archivo);
  aplicarTraducciones(fila);
}

// Tarjeta flotante junto al acordeon con dos escenas de muestra (A y B): al abrirla, y cada vez que cambia un ajuste, se
// reproduce la transicion elegida.
let tarjeta = null;
let reproduciendo = false;
let temporizadorRepeticion = null;

function cerrarTarjeta() {
  clearTimeout(temporizadorRepeticion);
  tarjeta?.remove();
  tarjeta = null;
}

async function reproducir() {
  if (!tarjeta || reproduciendo || transicion().tipo === NINGUNA) return;
  reproduciendo = true;
  const escenario = tarjeta.querySelector('.edi-transicion-vista');
  escenario.innerHTML = '<div class="edi-transicion-a">A</div><div class="edi-transicion-b">B</div>';
  const [a, b] = escenario.children;
  try { await transicionar(a, b, transicion()); } finally { reproduciendo = false; }
}

/** Con la tarjeta abierta, un cambio de ajuste la vuelve a reproducir (con una pequena espera para los controles deslizantes). */
function repetirSiAbierta() {
  if (!tarjeta) return;
  clearTimeout(temporizadorRepeticion);
  temporizadorRepeticion = setTimeout(reproducir, 250);
}

function abrirTarjeta() {
  cerrarTarjeta();
  tarjeta = document.createElement('div');
  tarjeta.className = 'edi-transicion-tarjeta';
  tarjeta.setAttribute('role', 'dialog');
  tarjeta.setAttribute('aria-labelledby', 'ovlTransicionTarjetaTitulo');
  tarjeta.innerHTML = `
    <div class="edi-transicion-tarjeta-barra">
      <span id="ovlTransicionTarjetaTitulo" data-i18n="${CLAVE}.transicionVistaPrevia"></span>
      <span class="edi-transicion-tarjeta-acciones">
        <button type="button" class="edi-icono-boton" data-repetir data-i18n-title="${CLAVE}.transicionRepetir" data-i18n-aria-label="${CLAVE}.transicionRepetir"><img src="icons/replay.svg" alt=""></button>
        <button type="button" class="edi-icono-boton" data-cerrar data-i18n-title="overlayCat.cerrar" data-i18n-aria-label="overlayCat.cerrar"><img src="icons/close.svg" alt=""></button>
      </span>
    </div>
    <div class="edi-transicion-vista"></div>`;
  // Junto al acordeon, a su derecha y a su altura, sin salirse de la ventana.
  const { right } = panel().closest('.edi-capas').getBoundingClientRect();
  const { top } = panel().getBoundingClientRect();
  tarjeta.style.left = `${right + 12}px`;
  tarjeta.style.top = `${Math.max(8, Math.min(top, window.innerHeight - 240))}px`;
  document.body.append(tarjeta);
  aplicarTraducciones(tarjeta);
  tarjeta.querySelector('[data-repetir]').addEventListener('click', reproducir);
  tarjeta.querySelector('[data-cerrar]').addEventListener('click', cerrarTarjeta);
  reproducir();
}

/**
 * Acordeon "Transiciones de escenas": la transicion que se reproduce en OBS al cambiar de escena con un atajo en el
 * enlace de escena activa. Usa los mismos campos (`cfg-field`) que el panel de ajustes de cada overlay.
 */
export function iniciarPanelTransiciones() {
  const { min, max, paso } = DURACION_TRANSICION;
  // Misma estructura que el inspector de cada overlay (ovl-inspector + grupos plegables cfg-grupo), con sus estilos.
  panel().innerHTML = `
    <div class="ovl-inspector">
      <details class="cfg-grupo" open>
        <summary class="cfg-grupo-titulo" data-i18n="${CLAVE}.transicionGrupoAnimacion"></summary>
        <div class="cfg-fields">
          <div class="cfg-field">
            <label for="ovlTransicionTipo" data-i18n="${CLAVE}.transicionTipo"></label>
            <select id="ovlTransicionTipo" data-campo="tipo">
              ${opciones([NINGUNA, ...TIPOS_MOVIMIENTO, ...TIPOS_MASCARA, ...TIPOS_ESPECIALES])}
            </select>
          </div>
          <div class="cfg-field">
            <label for="ovlTransicionDuracion"><span data-i18n="${CLAVE}.transicionDuracion"></span>: <span data-valor="duracion"></span></label>
            <input type="range" id="ovlTransicionDuracion" data-campo="duracion" min="${min}" max="${max}" step="${paso}">
          </div>
          <div class="cfg-field" data-grupo="invertir">
            <label class="toggle-chip"><input type="checkbox" data-campo="invertir"> <span data-i18n="${CLAVE}.transicionInvertir"></span></label>
          </div>
        </div>
      </details>
      <details class="cfg-grupo" data-grupo="color" open>
        <summary class="cfg-grupo-titulo" data-i18n="${CLAVE}.transicionColor"></summary>
        <div class="cfg-fields">
          <div class="cfg-field">
            <label for="ovlTransicionColor" data-i18n="${CLAVE}.transicionColor"></label>
            <input type="color" id="ovlTransicionColor" data-campo="color">
          </div>
        </div>
      </details>
      <details class="cfg-grupo" data-grupo="stinger" open>
        <summary class="cfg-grupo-titulo" data-i18n="${CLAVE}.transicion_stinger"></summary>
        <div class="cfg-fields">
          <div class="cfg-field full edi-gif-alerta-eleccion" data-stinger-eleccion></div>
          <div class="cfg-field">
            <label for="ovlTransicionStingerSrc" data-i18n="${CLAVE}.transicionStingerUrl"></label>
            <input type="text" id="ovlTransicionStingerSrc" data-campo="stingerSrc" placeholder="https://…/stinger.webm" spellcheck="false">
          </div>
          <div class="cfg-field">
            <label for="ovlTransicionStingerPunto"><span data-i18n="${CLAVE}.transicionStingerPunto"></span>: <span data-valor="stingerPunto"></span></label>
            <input type="range" id="ovlTransicionStingerPunto" data-campo="stingerPunto" min="${STINGER_PUNTO.min}" max="${STINGER_PUNTO.max}" step="${STINGER_PUNTO.paso}">
          </div>
          <p class="cuenta-hint" data-i18n="${CLAVE}.transicionStingerAyuda"></p>
        </div>
      </details>
      <div class="edi-transicion-pie">
        <button type="button" class="cfg-btn edi-transicion-probar" data-probar>
          <img class="icon-inline" src="icons/play_arrow.svg" alt=""> <span data-i18n="${CLAVE}.transicionProbar"></span>
        </button>
        <p class="cuenta-hint" data-i18n="${CLAVE}.transicionAyuda"></p>
      </div>
    </div>`;
  aplicarTraducciones(panel());

  guardarStinger = (cambio) => guardar({ stinger: { ...transicion().stinger, ...cambio } });
  const guardar = (cambio) => { Object.assign(transicion(), cambio); saveSettings(); refrescarPanelTransiciones(); repetirSiAbierta(); };
  campo('tipo').addEventListener('change', (evento) => guardar({ tipo: evento.target.value }));
  campo('duracion').addEventListener('input', (evento) => guardar({ duracion: Number(evento.target.value) }));
  campo('invertir').addEventListener('change', (evento) => guardar({ invertir: evento.target.checked }));
  campo('color').addEventListener('input', (evento) => guardar({ color: evento.target.value }));
  campo('stingerSrc').addEventListener('change', (evento) => guardar({ stinger: { ...transicion().stinger, src: evento.target.value.trim() } }));
  campo('stingerPunto').addEventListener('input', (evento) => guardar({ stinger: { ...transicion().stinger, punto: Number(evento.target.value) } }));
  panel().querySelector('[data-probar]').addEventListener('click', abrirTarjeta);
  document.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') cerrarTarjeta(); });
  refrescarPanelTransiciones();
}
