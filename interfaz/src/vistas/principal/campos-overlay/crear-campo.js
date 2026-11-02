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

// Botones que fijan uno o varios valores al pulsarlos; index.js los atiende y sincronizar.js marca el activo.
const atributosBoton = (overlay, valores) => `type="button" data-cfg-overlay="${overlay}" data-cfg-fija='${JSON.stringify(valores)}'`;

function crearBotones(overlay, campo) {
  const botones = campo.opciones.map((valor) => {
    const texto = etiquetaOpcion(campo, valor);
    const contenido = campo.iconos ? `<img class="icon-inline" src="icons/${campo.iconos[valor]}.svg" alt="">` : campo.simbolos?.[valor] ?? texto;
    return `<button class="cfg-boton" ${atributosBoton(overlay, { [campo.clave]: valor })} title="${texto}" aria-label="${texto}">${contenido}</button>`;
  });
  return `<label>${etiquetaCampo(campo)}</label><div class="cfg-botones" role="group">${botones.join('')}</div>`;
}

function crearRejilla(overlay, campo) {
  const celdas = campo.opciones.flatMap((vertical) => campo.opcionesH.map((horizontal) => {
    const texto = `${etiquetaOpcion(campo, vertical)} / ${etiquetaOpcion(campo, horizontal)}`;
    return `<button class="cfg-celda" ${atributosBoton(overlay, { posicionH: horizontal, posicionV: vertical, desplazaX: 0, desplazaY: 0 })} title="${texto}" aria-label="${texto}"></button>`;
  }));
  return `<label>${etiquetaCampo(campo)}</label><div class="cfg-rejilla" role="group">${celdas.join('')}</div>`;
}

function crearContenidoCampo(overlay, campo) {
  if (campo.ui === 'botones') return crearBotones(overlay, campo);
  if (campo.ui === 'rejilla') return crearRejilla(overlay, campo);
  if (campo.tipo === 'bool') return crearInterruptor(overlay, campo);
  if (campo.tipo === 'plataformas') return crearInterruptoresPlataforma(overlay, campo);
  const valor = campo.ui === 'rango' ? ': <span data-cfg-valor></span>' : '';
  return `<label for="${idDe(overlay, campo)}">${etiquetaCampo(campo)}${valor}</label>${crearEntrada(overlay, campo)}`;
}

/** Un `.cfg-field` del formulario de un overlay, segun el tipo del campo del esquema. */
export function crearCampo(overlay, campo) {
  const contenedor = document.createElement('div');
  contenedor.className = `cfg-field${campo.tipo === 'plataformas' ? ' full' : ''}`;
  contenedor.innerHTML = crearContenidoCampo(overlay, campo);
  if (campo.dependeDe) {
    contenedor.dataset.cfgDependeDe = campo.dependeDe;
    contenedor.dataset.cfgOverlay = overlay;
  }
  return contenedor;
}
