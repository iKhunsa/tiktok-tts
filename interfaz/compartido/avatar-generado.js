/**
 * Avatar para quien no tiene foto: variante "beam" de Boring Avatars (boringavatars.com,
 * licencia MIT). Portada porque el paquete requiere React; se genera aqui mismo para
 * no enviar nombres de usuario a ningun servicio. El mismo nombre da siempre la misma cara.
 */
const COLORES = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];
const TAMANO = 36;

function numeroDe(nombre) {
  let hash = 0;
  for (const letra of nombre) hash = (Math.imul(hash, 31) + letra.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

const digito = (numero, posicion) => Math.floor((numero / 10 ** posicion) % 10);
const esPar = (numero, posicion) => digito(numero, posicion) % 2 === 0;
const color = (numero) => COLORES[numero % COLORES.length];

function unidad(numero, rango, posicion) {
  const valor = numero % rango;
  return posicion && esPar(numero, posicion) ? -valor : valor;
}

function colorContraste(hex) {
  const canal = (inicio) => parseInt(hex.slice(inicio, inicio + 2), 16);
  return (canal(1) * 299 + canal(3) * 587 + canal(5) * 114) / 1000 >= 128 ? '#000' : '#fff';
}

const desplazar = (valor) => (valor < 5 ? valor + TAMANO / 9 : valor);

/** Data URI de un SVG, listo para el src de un <img>. */
export function avatarGenerado(nombre) {
  const n = numeroDe(String(nombre ?? ''));
  const fondo = color(n);
  const cara = colorContraste(fondo);
  const x = desplazar(unidad(n, 10, 1));
  const y = desplazar(unidad(n, 10, 2));
  const caraX = x > TAMANO / 6 ? x / 2 : unidad(n, 8, 1);
  const caraY = y > TAMANO / 6 ? y / 2 : unidad(n, 7, 2);
  const ojos = unidad(n, 5);
  const boca = unidad(n, 3);
  const centro = TAMANO / 2;
  const trazoBoca = esPar(n, 2)
    ? `<path d="M15 ${19 + boca}c2 1 4 1 6 0" stroke="${cara}" fill="none" stroke-linecap="round"/>`
    : `<path d="M13,${19 + boca} a1,0.75 0 0,0 10,0" fill="${cara}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TAMANO} ${TAMANO}">`
    + `<rect width="${TAMANO}" height="${TAMANO}" fill="${color(n + 13)}"/>`
    + `<rect width="${TAMANO}" height="${TAMANO}" fill="${fondo}" rx="${esPar(n, 1) ? TAMANO : TAMANO / 6}" `
    + `transform="translate(${x} ${y}) rotate(${unidad(n, 360)} ${centro} ${centro}) scale(${1 + unidad(n, 3) / 10})"/>`
    + `<g transform="translate(${caraX} ${caraY}) rotate(${unidad(n, 10, 3)} ${centro} ${centro})">${trazoBoca}`
    + `<rect x="${14 - ojos}" y="14" width="1.5" height="2" rx="1" fill="${cara}"/>`
    + `<rect x="${20 + ojos}" y="14" width="1.5" height="2" rx="1" fill="${cara}"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
