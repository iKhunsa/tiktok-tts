import { t, idiomaActual } from '../../../nucleo/i18n/i18n.js';
import { paintRangeFill } from '../../../componentes/campos-formulario.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { ajustesEpik, guardarAjusteEpik, restablecerAjustesEpik } from './estado.js';

// Las etiquetas vienen del archivo: todo va por textContent/value, nunca como HTML.
// Texto del manifest: uno solo o traducido { es, en, ... }. Idioma del streamer, si no espanol, ingles o el primero.
function textoLocal(valor) {
  if (!valor || typeof valor === 'string') return valor || '';
  const idioma = idiomaActual();
  return valor[idioma] ?? valor[idioma?.split('-')[0]] ?? valor.es ?? valor.en ?? Object.values(valor)[0];
}

const textoRango = (campo, valor) => (campo.porcentaje ? `${Math.round(valor * 100)}%` : String(valor));

function crearEntrada(campo, valor) {
  if (campo.tipo === 'opcion') {
    const select = document.createElement('select');
    campo.opciones.forEach((opcion, n) => {
      const elemento = document.createElement('option');
      elemento.value = opcion;
      elemento.textContent = textoLocal(campo.etiquetasOpciones?.[n]) || opcion;
      select.append(elemento);
    });
    select.value = valor;
    return select;
  }
  const entrada = document.createElement('input');
  if (campo.tipo === 'color') entrada.type = 'color';
  else if (campo.tipo === 'numero') Object.assign(entrada, { type: 'range', min: campo.min, max: campo.max, step: campo.step });
  else Object.assign(entrada, { type: 'text', maxLength: campo.max });
  entrada.value = valor;
  return entrada;
}

function leer(campo, entrada) {
  if (campo.tipo === 'bool') return entrada.checked;
  if (campo.tipo === 'numero') return Number(entrada.value);
  return entrada.value;
}

function crearCampo(epik, overlay, campo, valor) {
  const contenedor = document.createElement('div');
  contenedor.className = 'cfg-field';
  const id = `epik-${epik.id}-${campo.clave}`;
  let entrada;
  if (campo.tipo === 'bool') {
    const chip = document.createElement('label');
    chip.className = 'toggle-chip';
    entrada = document.createElement('input');
    entrada.type = 'checkbox';
    entrada.checked = valor;
    chip.append(entrada, ` ${textoLocal(campo.etiqueta)}`);
    contenedor.append(chip);
  } else {
    const etiqueta = document.createElement('label');
    etiqueta.htmlFor = id;
    etiqueta.textContent = textoLocal(campo.etiqueta);
    entrada = crearEntrada(campo, valor);
    contenedor.append(etiqueta, entrada);
    if (campo.tipo === 'numero') {
      const valorTexto = document.createElement('span');
      valorTexto.textContent = `: ${textoRango(campo, valor)}`;
      etiqueta.append(valorTexto);
      requestAnimationFrame(() => paintRangeFill(entrada));
      entrada.addEventListener('input', () => { valorTexto.textContent = `: ${textoRango(campo, Number(entrada.value))}`; paintRangeFill(entrada); });
    }
  }
  entrada.id = id;
  if (campo.ayuda) contenedor.title = textoLocal(campo.ayuda);
  entrada.addEventListener(campo.tipo === 'texto' ? 'change' : 'input', () => {
    guardarAjusteEpik(epik.id, campo.clave, leer(campo, entrada));
    updateOverlayUrl(overlay);
  });
  return contenedor;
}

/** Ajustes propios que declara el manifest del .epik en uso. alRestablecer redibuja la seccion. */
export function crearAjustesEpik(epik, overlay, alRestablecer) {
  const bloque = document.createElement('div');
  bloque.className = 'epik-ajustes';
  if (!epik.campos.length) return bloque;

  const titulo = document.createElement('p');
  titulo.className = 'cfg-subtitulo';
  titulo.textContent = t('overlayCfg.epik.ajustes', { nombre: epik.nombre });
  const guardado = ajustesEpik(epik.id);
  const rejilla = document.createElement('div');
  rejilla.className = 'cfg-fields';
  rejilla.append(...epik.campos.map((campo) => crearCampo(epik, overlay, campo, guardado[campo.clave] ?? campo.def)));

  const restablecer = document.createElement('button');
  restablecer.type = 'button';
  restablecer.className = 'cfg-btn epik-restablecer';
  restablecer.dataset.i18n = 'overlayCfg.epik.restablecer';
  restablecer.addEventListener('click', () => {
    restablecerAjustesEpik(epik.id);
    updateOverlayUrl(overlay);
    alRestablecer();
  });

  bloque.append(titulo, rejilla, restablecer);
  return bloque;
}
