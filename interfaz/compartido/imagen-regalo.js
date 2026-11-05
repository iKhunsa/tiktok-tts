// Imagen local de un regalo de TikTok (carpeta gifts/ del servidor) a partir de su nombre.
// La comparten el overlay de alertas y el anfitrion de los .epik de alertas.

const normalizar = (texto) => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

let mapa = new Map();
let diccionario = {};
let cargando = null;

/** Pide (una vez) el diccionario de nombres y la lista de PNG de regalos. */
export function cargarImagenesRegalo() {
  cargando ??= Promise.all([
    fetch('/gift-dict.json').then((r) => r.json()).then((dict) => {
      diccionario = Object.fromEntries(Object.entries(dict).map(([nombre, archivo]) => [normalizar(nombre), archivo]));
    }).catch(() => {}),
    fetch('/api/gifts-list').then((r) => r.json()).then((archivos) => {
      mapa = new Map(archivos.flatMap((archivo) => {
        const partes = archivo.match(/^\d+_(.+)\.png$/i);
        if (!partes) return [];
        const slug = normalizar(partes[1]);
        return [[slug, archivo], [slug.replace(/_/g, ''), archivo]];
      }));
    }).catch(() => {}),
  ]);
  return cargando;
}

/** Ruta /gifts/<archivo>.png del regalo, o null si no hay imagen local. */
export function imagenRegalo(nombre) {
  if (!nombre) return null;
  const buscado = normalizar(nombre);
  if (diccionario[buscado]) return `/gifts/${diccionario[buscado]}`;
  if (mapa.has(buscado)) return `/gifts/${mapa.get(buscado)}`;
  for (const [slug, archivo] of mapa) if (slug.includes(buscado) || buscado.includes(slug)) return `/gifts/${archivo}`;
  return null;
}
