import { TIPOS_CAMPO } from './tipos-campo.js';

// El selector de color devuelve minusculas ('#ffbb00') y el default se escribe en
// mayusculas ('#FFBB00'): son el mismo color y no deben viajar en la URL.
const normalizar = (valor) => (typeof valor === 'string' ? valor.toLowerCase() : valor);
const sonIguales = (a, b) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));

/** { clave: valor por defecto } de un esquema. Fuente unica de los defaults. */
export function valoresPorDefecto(esquema) {
  return Object.fromEntries(esquema.map((campo) => [campo.clave, campo.def]));
}

/** Querystring (sin "?") con solo lo que difiere del default: URLs cortas y estables. */
export function construirQuery(esquema, cfg) {
  const params = new URLSearchParams();
  for (const campo of esquema) {
    const valor = cfg[campo.clave];
    if (valor === undefined || sonIguales(valor, campo.def)) continue;
    params.set(campo.param, TIPOS_CAMPO[campo.tipo].aParam(valor, campo));
  }
  return params.toString();
}

/** Config completa de un overlay a partir de su URL; lo ausente o invalido cae al default. */
export function leerConfig(esquema, params) {
  return Object.fromEntries(esquema.map((campo) => {
    const texto = params.get(campo.param);
    const valor = texto === null ? campo.def : TIPOS_CAMPO[campo.tipo].deParam(texto, campo);
    return [campo.clave, valor];
  }));
}
