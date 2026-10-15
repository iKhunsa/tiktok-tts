import { etiquetaCampo, etiquetaOpcion } from './etiquetas.js';

const PLATAFORMAS = { tiktok: 'TikTok', twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick' };

const idDe = (overlay, campo) => `cfg-${overlay}-${campo.clave}`;

function atributosDatos(overlay, campo) {
  return `data-cfg-overlay="${overlay}" data-cfg-clave="${campo.clave}"`;
}

function crearEntrada(overlay, campo) {
  const base = `id="${idDe(overlay, campo)}" ${atributosDatos(overlay, campo)}`;
  if (campo.tipo === 'color') return `<input type="color" ${base} />`;
  if (campo.tipo === 'opcion') {
    const opciones = campo.opciones.map((valor) => `<option value="${valor}">${etiquetaOpcion(campo, valor)}</option>`);
    return `<select ${base}>${opciones.join('')}</select>`;
  }
  const limites = `min="${campo.min ?? ''}" max="${campo.max ?? ''}" step="${campo.step ?? 'any'}"`;
  if (campo.ui === 'rango') return `<input type="range" ${limites} ${base} />`;
  if (campo.tipo === 'numero') return `<input type="number" ${limites} ${base} />`;
  return `<input type="text" ${base} />`;
}

function crearInterruptor(overlay, campo) {
  return `<label class="toggle-chip" style="width:max-content;"><input type="checkbox" id="${idDe(overlay, campo)}" ${atributosDatos(overlay, campo)} /> ${etiquetaCampo(campo)}</label>`;
}

function crearInterruptoresPlataforma(overlay, campo) {
  const chips = Object.keys(campo.def).map((nombre) => (
    `<label class="toggle-chip" style="padding:6px 9px;"><input type="checkbox" ${atributosDatos(overlay, campo)} data-cfg-plataforma="${nombre}" /> ${PLATAFORMAS[nombre]}</label>`
  ));
  return `<label>${etiquetaCampo(campo)}</label><div style="display:flex;gap:6px;flex-wrap:wrap;">${chips.join('')}</div>`;
}

function crearContenidoCampo(overlay, campo) {
  if (campo.tipo === 'bool') return crearInterruptor(overlay, campo);
  if (campo.tipo === 'plataformas') return crearInterruptoresPlataforma(overlay, campo);
  const valor = campo.ui === 'rango' ? ' — <span data-cfg-valor></span>' : '';
  return `<label for="${idDe(overlay, campo)}">${etiquetaCampo(campo)}${valor}</label>${crearEntrada(overlay, campo)}`;
}

/** Un `.cfg-field` del formulario de un overlay, segun el tipo del campo del esquema. */
export function crearCampo(overlay, campo) {
  const contenedor = document.createElement('div');
  contenedor.className = `cfg-field${campo.tipo === 'plataformas' ? ' full' : ''}`;
  contenedor.innerHTML = crearContenidoCampo(overlay, campo);
  return contenedor;
}
