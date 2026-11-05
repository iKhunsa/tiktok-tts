'use strict';

const zlib = require('zlib');

const FIN_DIRECTORIO = 0x06054b50;
const ENTRADA_DIRECTORIO = 0x02014b50;
const CABECERA_LOCAL = 0x04034b50;
const MAX_COMENTARIO = 0xffff;

function buscarFinDirectorio(zip) {
  const desde = Math.max(0, zip.length - 22 - MAX_COMENTARIO);
  for (let i = zip.length - 22; i >= desde; i -= 1) {
    if (zip.readUInt32LE(i) === FIN_DIRECTORIO) return i;
  }
  throw new Error('no es un zip');
}

/**
 * Lector minimo de ZIP (store y deflate, sin zip64 ni cifrado), suficiente para un .epik.
 * Devuelve [{ nombre, tamano, leer() }]: el tamano se conoce antes de descomprimir,
 * para que quien llama corte archivos enormes sin inflarlos.
 * ponytail: sin zip64; un .epik pasa por limites de MB muy por debajo de 4 GB.
 */
function leerZip(zip) {
  const fin = buscarFinDirectorio(zip);
  const total = zip.readUInt16LE(fin + 10);
  let p = zip.readUInt32LE(fin + 16);
  const entradas = [];
  for (let n = 0; n < total; n += 1) {
    if (zip.readUInt32LE(p) !== ENTRADA_DIRECTORIO) throw new Error('directorio del zip roto');
    const banderas = zip.readUInt16LE(p + 8);
    const metodo = zip.readUInt16LE(p + 10);
    const comprimido = zip.readUInt32LE(p + 20);
    const tamano = zip.readUInt32LE(p + 24);
    const largoNombre = zip.readUInt16LE(p + 28);
    const largoExtra = zip.readUInt16LE(p + 30);
    const largoComentario = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const nombre = zip.toString('utf8', p + 46, p + 46 + largoNombre);
    p += 46 + largoNombre + largoExtra + largoComentario;

    if (banderas & 1) throw new Error('zip cifrado');
    if (metodo !== 0 && metodo !== 8) throw new Error(`compresion no soportada (${metodo})`);
    entradas.push({
      nombre,
      tamano,
      leer() {
        if (zip.readUInt32LE(local) !== CABECERA_LOCAL) throw new Error('cabecera local rota');
        const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
        const datos = zip.subarray(inicio, inicio + comprimido);
        const salida = metodo === 0 ? Buffer.from(datos) : zlib.inflateRawSync(datos, { maxOutputLength: Math.max(tamano, 1) });
        if (salida.length !== tamano) throw new Error('tamano distinto al declarado');
        return salida;
      },
    });
  }
  return entradas;
}

module.exports = { leerZip };
