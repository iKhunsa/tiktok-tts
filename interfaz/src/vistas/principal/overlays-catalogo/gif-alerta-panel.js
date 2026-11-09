import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { aplicarTraducciones, t } from '../../../nucleo/i18n/i18n.js';
import { paintRangeFill } from '../../../componentes/campos-formulario.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { abrirSelectorGif } from './gif-selector-ventana.js';

function elemento(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}
const conTexto = (el, clave) => { el.dataset.i18n = clave; return el; };

const esAlerta = (id) => !!ESQUEMAS[id]?.some(({ clave }) => clave === 'gifAlerta');
const LADO_DEFECTO = 64;
const RADIO_DEFECTO = 22;
const CROMA_DEFECTO = '00ff00'; // el verde de las pantallas verdes
const TOLERANCIA_DEFECTO = 40;

/**
 * Seccion "GIF de la alerta" del panel de ajustes del editor de canvas, con el aspecto de los demas acordeones
 * (solo existe aqui, no en los ajustes de cada overlay): para las alertas, usar un GIF de "Mis GIFs" como imagen
 * de la alerta, con su ancho y alto, el redondeo de las esquinas y, si hace falta, quitarle el fondo (croma).
 * Mientras hay un GIF, la imagen normal de la alerta (icono o foto de perfil) queda desactivada: nunca salen las
 * dos a la vez. Devuelve null para los overlays que no son alertas.
 */
export function crearSeccionGifAlerta(id) {
  if (!esAlerta(id)) return null;
  const cfg = () => appSettings.overlays[id];
  // `ovl-inspector` da a la seccion el mismo estilo de acordeones y campos que el inspector de cada overlay.
  const seccion = elemento('section', 'ovl-inspector edi-gif-alerta');
  const grupo = elemento('details', 'cfg-grupo');
  grupo.open = false; // cerrado: se abre solo cuando se quiere usar un GIF
  const resumen = elemento('summary', 'cfg-grupo-titulo');
  resumen.append(conTexto(elemento('span'), 'gifs.alerta.titulo'));
  const campos = elemento('div', 'cfg-fields');
  grupo.append(resumen, campos);
  seccion.append(grupo);

  function aplicar() {
    saveSettings();
    updateOverlayUrl(id); // la vista del canvas se recarga con la URL nueva
  }

  // Un campo del acordeon: etiqueta y control, con las clases de los demas ajustes.
  const campo = (etiqueta, control, { completo = false, valor } = {}) => {
    const fila = elemento('div', `cfg-field${completo ? ' full' : ''}`);
    const label = elemento('label');
    label.append(conTexto(elemento('span'), etiqueta));
    if (valor) label.append(': ', valor);
    fila.append(label, control);
    return fila;
  };
  const rango = (clave, etiqueta, { min, max, defecto, formato }) => {
    const valor = elemento('span');
    const entrada = elemento('input');
    Object.assign(entrada, { type: 'range', min: String(min), max: String(max), step: '1', value: String(cfg()[clave] ?? defecto) });
    const pintar = () => { valor.textContent = formato(Number(entrada.value)); paintRangeFill(entrada); };
    entrada.addEventListener('input', () => { cfg()[clave] = Number(entrada.value); pintar(); aplicar(); });
    pintar();
    return campo(etiqueta, entrada, { valor });
  };
  const numero = (clave, etiqueta) => {
    const entrada = elemento('input');
    Object.assign(entrada, { type: 'number', min: '16', max: '600', value: String(cfg()[clave] || LADO_DEFECTO) });
    entrada.addEventListener('change', () => {
      const valor = Math.min(600, Math.max(16, Math.round(Number(entrada.value)) || LADO_DEFECTO));
      entrada.value = String(valor);
      cfg()[clave] = valor;
      aplicar();
    });
    return campo(etiqueta, entrada);
  };

  function eleccion(gif) {
    const fila = elemento('div', 'cfg-field full edi-gif-alerta-eleccion');
    const elegir = conTexto(elemento('button', 'edi-gif-alerta-elegir'), gif ? 'gifs.alerta.cambiar' : 'gifs.alerta.elegir');
    elegir.type = 'button';
    elegir.addEventListener('click', () => abrirSelectorGif({
      actual: gif,
      alElegir: (src) => { cfg().gifAlerta = src; aplicar(); pintar(); },
    }));
    if (!gif) { fila.append(elegir); return fila; }
    const esVideo = /\.(mp4|webm)(?:$|[?#])/i.test(gif);
    const vista = elemento(esVideo ? 'video' : 'img', 'edi-gif-alerta-actual');
    if (esVideo) Object.assign(vista, { muted: true, loop: true, autoplay: true, playsInline: true });
    else vista.alt = '';
    vista.src = gif;
    // Quitar es un icono de papelera junto a Cambiar GIF; su nombre queda en el titulo y para lectores de pantalla.
    const quitar = elemento('button', 'edi-gif-alerta-quitar');
    quitar.type = 'button';
    quitar.title = t('gifs.alerta.quitar');
    quitar.setAttribute('aria-label', t('gifs.alerta.quitar'));
    quitar.append(Object.assign(elemento('img', 'icon-inline'), { src: 'icons/delete.svg', alt: '' }));
    quitar.addEventListener('click', () => { cfg().gifAlerta = ''; aplicar(); pintar(); });
    const acciones = elemento('div', 'edi-gif-alerta-acciones');
    acciones.append(elegir, quitar);
    fila.append(vista, acciones);
    return fila;
  }

  // Quitar el fondo: un interruptor y, encendido, el color a quitar (con cuentagotas) y cuanta tolerancia.
  function croma() {
    const activo = Boolean(cfg().gifCroma);
    const interruptor = elemento('div', 'cfg-field');
    const etiqueta = elemento('label', 'toggle-chip');
    const marca = elemento('input');
    marca.type = 'checkbox';
    marca.checked = activo;
    marca.addEventListener('change', () => { cfg().gifCroma = marca.checked ? CROMA_DEFECTO : ''; aplicar(); pintar(); });
    etiqueta.append(marca, conTexto(elemento('span'), 'gifs.alerta.croma'));
    interruptor.append(etiqueta);
    if (!activo) return [interruptor];

    const color = elemento('input');
    color.type = 'color';
    color.value = `#${cfg().gifCroma}`;
    const poner = (hex) => { color.value = hex; cfg().gifCroma = hex.replace('#', '').toLowerCase(); aplicar(); };
    color.addEventListener('input', () => poner(color.value));
    const control = elemento('div', 'edi-gif-alerta-color');
    control.append(color);
    if (window.EyeDropper) {
      const gotero = elemento('button', 'edi-gif-alerta-gotero');
      gotero.type = 'button';
      gotero.title = t('gifs.alerta.cuentagotas');
      gotero.setAttribute('aria-label', t('gifs.alerta.cuentagotas'));
      gotero.append(Object.assign(elemento('img', 'icon-inline'), { src: 'icons/colorize.svg', alt: '' }));
      gotero.addEventListener('click', () => new window.EyeDropper().open().then(({ sRGBHex }) => poner(sRGBHex)).catch(() => {}));
      control.append(gotero);
    }
    const fila = campo('gifs.alerta.cromaColor', control);
    fila.classList.add('edi-gif-alerta-fila');
    return [interruptor, fila, rango('gifCromaTol', 'gifs.alerta.cromaTol', { min: 0, max: 100, defecto: TOLERANCIA_DEFECTO, formato: (v) => `${v}%` })];
  }

  // La imagen normal de la alerta (icono / foto de perfil) no se usa mientras haya un GIF: se atenua y no se puede cambiar.
  function marcarImagenAlerta(conGif) {
    document.querySelectorAll(`[data-cfg-overlay="${id}"][data-cfg-fija]`).forEach((boton) => {
      if (!('imagenAlerta' in JSON.parse(boton.dataset.cfgFija))) return;
      boton.disabled = conGif;
      const fila = boton.closest('.cfg-field');
      fila?.classList.toggle('bloqueado-por-gif', conGif);
      if (fila) fila.title = conGif ? t('gifs.alerta.reemplaza') : '';
    });
  }

  function pintar() {
    const gif = cfg().gifAlerta || '';
    const contenido = [conTexto(elemento('p', 'edi-gif-alerta-desc'), 'gifs.alerta.desc'), eleccion(gif)];
    if (gif) {
      contenido.push(
        conTexto(elemento('p', 'edi-gif-alerta-desc'), 'gifs.alerta.reemplaza'),
        numero('gifAncho', 'gifs.alerta.ancho'),
        numero('gifAlto', 'gifs.alerta.alto'),
        rango('gifRadio', 'gifs.alerta.radio', { min: 0, max: 50, defecto: RADIO_DEFECTO, formato: (v) => `${v}%` }),
        ...croma(),
      );
    }
    campos.replaceChildren(...contenido);
    aplicarTraducciones(seccion);
    // El inspector se monta justo despues de crear esta seccion: se marca cuando ya esta en pantalla.
    requestAnimationFrame(() => marcarImagenAlerta(Boolean(gif)));
  }
  pintar();
  return seccion;
}
