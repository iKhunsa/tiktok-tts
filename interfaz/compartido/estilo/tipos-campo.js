/**
 * Como viaja cada tipo de campo del esquema por la querystring de un overlay.
 * `aParam` devuelve el string a escribir; `deParam` recibe el string leido
 * (nunca null: query.js solo llama cuando el param existe) y el campo, y
 * devuelve el valor tipado o el default si el string no es valido.
 */
const HEX_COLOR = /^[0-9a-f]{3,8}$/i;

export const TIPOS_CAMPO = {
  numero: {
    aParam: (valor) => String(valor),
    deParam: (texto, campo) => {
      const numero = parseFloat(texto);
      return Number.isFinite(numero) ? numero : campo.def;
    },
  },
  texto: {
    aParam: (valor) => valor,
    deParam: (texto) => texto,
  },
  opcion: {
    aParam: (valor) => valor,
    deParam: (texto, campo) => (campo.opciones.includes(texto) ? texto : campo.def),
  },
  color: {
    aParam: (valor) => valor.replace('#', ''),
    deParam: (texto, campo) => (HEX_COLOR.test(texto) ? `#${texto}` : campo.def),
  },
  bool: {
    aParam: (valor) => (valor ? '1' : '0'),
    deParam: (texto) => texto === '1' || texto === 'true',
  },
  // { tiktok: true, twitch: false, ... } <-> "tiktok,youtube". Se escribe solo
  // si falta alguna plataforma; "todas" es el default y no viaja.
  plataformas: {
    aParam: (valor) => Object.keys(valor).filter((nombre) => valor[nombre] !== false).join(','),
    deParam: (texto, campo) => {
      const visibles = new Set(texto.split(',').map((nombre) => nombre.trim().toLowerCase()));
      return Object.fromEntries(Object.keys(campo.def).map((nombre) => [nombre, visibles.has(nombre)]));
    },
  },
};
