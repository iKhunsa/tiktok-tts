import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { crearAudioAlerta } from '../../../../compartido/sonido-alerta.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { aplicarTraducciones, t } from '../../../nucleo/i18n/i18n.js';
import { paintRangeFill } from '../../../componentes/campos-formulario.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { apiSonidos } from '../gif-buscador/api.js';
import { srcAbsoluta } from './gif-capas.js';
import { abrirSelectorSonido } from './sonido-selector-ventana.js';

function elemento(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}
const conTexto = (el, clave) => { el.dataset.i18n = clave; return el; };
const icono = (nombre) => Object.assign(elemento('img', 'icon-inline'), { src: `icons/${nombre}.svg`, alt: '' });

const esAlerta = (id) => !!ESQUEMAS[id]?.some(({ clave }) => clave === 'sonidoAlerta');
const BANDAS = [['sonidoGraves', 'sonidos.alerta.graves'], ['sonidoMedios', 'sonidos.alerta.medios'], ['sonidoAgudos', 'sonidos.alerta.agudos']];
const conSigno = (valor) => (valor > 0 ? `+${valor}` : String(valor));

/**
 * Acordeon "Sonido de la alerta" del panel de ajustes del editor de canvas, debajo del de GIF y con su mismo aspecto
 * (solo existe aqui, no en los ajustes de cada overlay): para las alertas, un boton que abre la ventana de "Mis sonidos"
 * y, ya elegido, la cancion con Cambiar sonido y la papelera, mas volumen, tono y un ecualizador basico opcional.
 * Devuelve null si el overlay no es una alerta.
 */
export function crearSeccionSonidoAlerta(id) {
  if (!esAlerta(id)) return null;
  const cfg = () => appSettings.overlays[id];
  // `edi-gif-alerta` + `ovl-inspector` dan a la seccion el mismo estilo de acordeon que la de GIF y hacen que el editor la retire junto a ella.
  const seccion = elemento('section', 'ovl-inspector edi-gif-alerta edi-sonido-alerta');
  const grupo = elemento('details', 'cfg-grupo');
  grupo.open = false; // cerrado: se abre solo cuando se quiere usar un sonido
  const resumen = elemento('summary', 'cfg-grupo-titulo');
  resumen.append(conTexto(elemento('span'), 'sonidos.alerta.titulo'));
  const campos = elemento('div', 'cfg-fields');
  grupo.append(resumen, campos);
  seccion.append(grupo);

  let items = [];
  let prueba = null; // el sonido que se esta oyendo (uno a la vez)
  let ecualizadorAbierto = false;
  const parar = () => { prueba?.pause(); prueba = null; };

  function aplicar() {
    saveSettings();
    updateOverlayUrl(id); // la vista del canvas se recarga con la URL nueva
  }

  // La prueba suena con los ajustes actuales (volumen, tono y ecualizador), igual que en la alerta.
  function oir(src) {
    parar();
    prueba = crearAudioAlerta(src, cfg());
    prueba?.play().catch(() => {});
  }

  const nombreDe = (src) => {
    const item = items.find((otro) => srcAbsoluta(otro) === src);
    if (item) return item.nombre;
    try { return decodeURIComponent(new URL(src).pathname.split('/').pop()); } catch { return src; }
  };

  const campo = (etiqueta, control, valor) => {
    const fila = elemento('div', 'cfg-field');
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
    const pintarValor = () => { valor.textContent = formato(Number(entrada.value)); paintRangeFill(entrada); };
    entrada.addEventListener('input', () => { cfg()[clave] = Number(entrada.value); pintarValor(); aplicar(); });
    pintarValor();
    return campo(etiqueta, entrada, valor);
  };

  function eleccion(sonido) {
    const fila = elemento('div', 'cfg-field full edi-gif-alerta-eleccion');
    const elegir = conTexto(elemento('button', 'edi-gif-alerta-elegir'), sonido ? 'sonidos.alerta.cambiar' : 'sonidos.alerta.elegir');
    elegir.type = 'button';
    elegir.addEventListener('click', () => abrirSelectorSonido({
      actual: sonido,
      alElegir: (src) => { cfg().sonidoAlerta = src; aplicar(); pintar(); },
    }));
    if (!sonido) { fila.append(elegir); return fila; }
    // La cancion elegida ocupa el lugar de la vista previa del GIF: un boton grande para oirla y su nombre.
    const tarjeta = elemento('div', 'edi-sonido-actual');
    const oirBoton = elemento('button', 'edi-sonido-oir edi-sonido-oir-grande');
    oirBoton.type = 'button';
    oirBoton.dataset.i18nTitle = 'sonidos.alerta.oir';
    oirBoton.dataset.i18nAriaLabel = 'sonidos.alerta.oir';
    oirBoton.append(icono('play_arrow'));
    oirBoton.addEventListener('click', () => oir(sonido));
    const nombre = elemento('span', 'edi-sonido-actual-nombre', nombreDe(sonido));
    nombre.title = nombre.textContent;
    tarjeta.append(oirBoton, nombre);
    // Quitar es un icono de papelera junto a Cambiar sonido, como en el GIF.
    const quitar = elemento('button', 'edi-gif-alerta-quitar');
    quitar.type = 'button';
    quitar.title = t('sonidos.alerta.quitar');
    quitar.setAttribute('aria-label', t('sonidos.alerta.quitar'));
    quitar.append(icono('delete'));
    quitar.addEventListener('click', () => { cfg().sonidoAlerta = ''; ecualizadorAbierto = false; aplicar(); pintar(); });
    const acciones = elemento('div', 'edi-gif-alerta-acciones');
    acciones.append(elegir, quitar);
    fila.append(tarjeta, acciones);
    return fila;
  }

  // Ecualizador basico, solo si uno quiere: un interruptor y, encendido, graves, medios y agudos. Apagarlo los deja en cero.
  function ecualizador() {
    const tocado = BANDAS.some(([clave]) => cfg()[clave]);
    const activo = ecualizadorAbierto || tocado;
    const interruptor = elemento('div', 'cfg-field');
    const etiqueta = elemento('label', 'toggle-chip');
    const marca = elemento('input');
    marca.type = 'checkbox';
    marca.checked = activo;
    marca.addEventListener('change', () => {
      ecualizadorAbierto = marca.checked;
      if (!marca.checked) { BANDAS.forEach(([clave]) => { cfg()[clave] = 0; }); aplicar(); }
      pintar();
    });
    etiqueta.append(marca, conTexto(elemento('span'), 'sonidos.alerta.ecualizador'));
    interruptor.append(etiqueta);
    if (!activo) return [interruptor];
    return [interruptor, ...BANDAS.map(([clave, etiquetaBanda]) => rango(clave, etiquetaBanda, { min: -12, max: 12, defecto: 0, formato: (v) => `${conSigno(v)} dB` }))];
  }

  function pintar() {
    parar();
    const actual = cfg().sonidoAlerta || '';
    campos.replaceChildren(
      conTexto(elemento('p', 'edi-gif-alerta-desc'), 'sonidos.alerta.desc'),
      eleccion(actual),
      ...(actual ? [
        rango('sonidoVolumen', 'sonidos.alerta.volumen', { min: 0, max: 100, defecto: 100, formato: (v) => `${v}%` }),
        rango('sonidoTono', 'sonidos.alerta.tono', { min: -12, max: 12, defecto: 0, formato: conSigno }),
        ...ecualizador(),
      ] : []),
    );
    aplicarTraducciones(seccion);
  }

  const cargar = () => apiSonidos.listar().then((r) => { items = r.items; }).catch(() => { items = []; }).finally(pintar);
  // La seccion se recrea al elegir otra capa: cuando ya no esta en pantalla deja de escuchar y de sonar.
  const alCambiar = () => {
    if (seccion.isConnected) cargar();
    else { parar(); document.removeEventListener('sonidos:cambiaron', alCambiar); }
  };
  document.addEventListener('sonidos:cambiaron', alCambiar);
  cargar();
  return seccion;
}
