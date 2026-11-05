'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { RESOURCE_BASE } = require('../../core/paths');
const { accountDataPath } = require('../../core/account-data-path');
const { leerZip } = require('./read-zip');
const { validarManifest, ManifestInvalido, FAMILIAS, OVERLAYS_SOPORTADOS, familiaDe, ID_VALIDO } = require('./validate-manifest');

const MAX_ARCHIVOS = 400;
const MAX_ARCHIVO = 40 * 1024 * 1024;
const MAX_TOTAL = 80 * 1024 * 1024;
const EXTENSIONES = new Set(['html', 'css', 'js', 'json', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif',
  'woff', 'woff2', 'ttf', 'otf', 'mp3', 'ogg', 'wav', 'mp4', 'webm']);
const SEGMENTO_VALIDO = /^[\w\-. ]{1,80}$/;
const BASURA = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$|desktop\.ini$)/i;
// Plantillas que viajan con la app (carpeta epik/ en extraResources): se instalan solas en cada cuenta,
// no se pueden eliminar y se descargan para usarlas de punto de partida. Una por familia: plantilla-<familia>.epik.
const INTEGRADOS = Object.fromEntries(Object.keys(FAMILIAS).map((familia) => [`plantilla-${familia}`, `plantilla-${familia}.epik`]));

/** Error esperado de importacion: lleva el codigo HTTP y la clave i18n para la UI. */
class ErrorEpik extends Error {
  constructor(status, errorKey, message, extra = {}) {
    super(message);
    Object.assign(this, { status, errorKey, extra });
  }
}

const carpeta = (...partes) => accountDataPath('epik', ...partes);
const rutaRegistro = () => carpeta('registro.json');
const carpetaPaquete = (id) => carpeta('paquetes', id);

/** Registro por cuenta: { [id]: entrada }. Corrupto o ausente = vacio (nunca lanza). */
function leerRegistro() {
  try {
    return JSON.parse(fs.readFileSync(rutaRegistro(), 'utf8'));
  } catch {
    return {};
  }
}

function guardarRegistro(registro) {
  fs.mkdirSync(carpeta(), { recursive: true });
  const tmp = `${rutaRegistro()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(registro, null, 2));
  fs.renameSync(tmp, rutaRegistro());
}

function rutaSegura(nombre) {
  const partes = nombre.split('/');
  const valida = partes.length <= 6 && partes.every((parte) => SEGMENTO_VALIDO.test(parte) && parte !== '.' && parte !== '..');
  if (!valida) throw new ErrorEpik(400, 'errors.epikInvalido', `nombre de archivo no permitido: ${nombre}`);
  const extension = path.extname(nombre).slice(1).toLowerCase();
  if (!EXTENSIONES.has(extension)) throw new ErrorEpik(400, 'errors.epikInvalido', `tipo de archivo no permitido: ${nombre}`);
  return nombre;
}

// Si el zip trae todo dentro de una sola carpeta (comprimieron la carpeta y no su contenido), se aplana.
function quitarCarpetaRaiz(archivos) {
  if (archivos.some(({ nombre }) => nombre === 'manifest.json')) return archivos;
  const raiz = archivos[0]?.nombre.split('/')[0];
  const todosDentro = raiz && archivos.every(({ nombre }) => nombre.startsWith(`${raiz}/`));
  return todosDentro ? archivos.map((archivo) => ({ ...archivo, nombre: archivo.nombre.slice(raiz.length + 1) })) : archivos;
}

function leerPaquete(buffer) {
  let entradas;
  try {
    entradas = leerZip(buffer);
  } catch (error) {
    throw new ErrorEpik(400, 'errors.epikInvalido', `el archivo no es un .epik valido (${error.message})`);
  }
  const archivos = quitarCarpetaRaiz(entradas.filter(({ nombre }) => !nombre.endsWith('/') && !BASURA.test(nombre)));
  if (!archivos.length || archivos.length > MAX_ARCHIVOS) throw new ErrorEpik(400, 'errors.epikInvalido', `el paquete debe tener entre 1 y ${MAX_ARCHIVOS} archivos`);
  let total = 0;
  for (const archivo of archivos) {
    rutaSegura(archivo.nombre);
    total += archivo.tamano;
    if (archivo.tamano > MAX_ARCHIVO || total > MAX_TOTAL) throw new ErrorEpik(400, 'errors.epikInvalido', 'el paquete es demasiado grande');
  }
  return archivos;
}

function leerManifest(archivos) {
  const manifest = archivos.find(({ nombre }) => nombre === 'manifest.json');
  if (!manifest) throw new ErrorEpik(400, 'errors.epikInvalido', 'falta manifest.json');
  const nombres = new Set(archivos.map(({ nombre }) => nombre));
  try {
    return validarManifest(JSON.parse(manifest.leer().toString('utf8')), (ruta) => nombres.has(ruta));
  } catch (error) {
    const motivo = error instanceof ManifestInvalido ? error.message : `manifest.json no es JSON (${error.message})`;
    throw new ErrorEpik(400, 'errors.epikInvalido', `manifest.json: ${motivo}`);
  }
}

// Se escribe en una carpeta temporal y se cambia de golpe: una importacion a medias no rompe el paquete anterior.
function escribirPaquete(manifest, archivos) {
  const destino = carpetaPaquete(manifest.id);
  const tmp = `${destino}.tmp-${Date.now()}`;
  try {
    for (const archivo of archivos) {
      if (archivo.nombre === 'manifest.json') continue;
      const ruta = path.join(tmp, ...archivo.nombre.split('/'));
      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      fs.writeFileSync(ruta, archivo.leer());
    }
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify(manifest, null, 2)); // la version limpia
    fs.rmSync(destino, { recursive: true, force: true });
    fs.renameSync(tmp, destino);
  } catch (error) {
    fs.rmSync(tmp, { recursive: true, force: true });
    if (error instanceof ErrorEpik) throw error;
    throw new ErrorEpik(400, 'errors.epikInvalido', `no se pudo descomprimir (${error.message})`);
  }
}

const resumen = (manifest, fechas) => ({
  id: manifest.id,
  overlay: manifest.overlay,
  nombre: manifest.nombre,
  version: manifest.version,
  autor: manifest.autor,
  descripcion: manifest.descripcion,
  medida: manifest.medida,
  preview: manifest.preview ? `/epik/${manifest.id}/${manifest.preview}` : null,
  campos: manifest.campos,
  ...fechas,
});

/**
 * Importa un .epik en la cuenta activa. `overlay` es el acordeon donde lo soltaron:
 * si el archivo es de otro overlay se rechaza con 409 y su overlay real, para que la UI ofrezca moverlo.
 * Mismo id = actualizacion: se reemplazan los archivos y se conserva la fecha de importacion
 * (los ajustes del streamer van por id en la app, asi que tambien sobreviven).
 */
function importar(buffer, overlay, extra = {}) {
  const archivos = leerPaquete(buffer);
  const manifest = leerManifest(archivos);
  if (!FAMILIAS[manifest.overlay]) {
    throw new ErrorEpik(422, 'errors.epikNoSoportado', `todavia no se pueden importar .epik de ${manifest.overlay}`, { overlay: manifest.overlay });
  }
  // `overlay` en el 409 es el primer overlay de la familia del archivo: ahi lo ofrece mover la UI.
  if (overlay && familiaDe(overlay) !== manifest.overlay) {
    throw new ErrorEpik(409, 'errors.epikOtroOverlay', `este .epik es para ${manifest.overlay}`, { overlay: FAMILIAS[manifest.overlay][0], familia: manifest.overlay, nombre: manifest.nombre });
  }
  const registro = leerRegistro();
  const anterior = registro[manifest.id];
  if (anterior?.integrado && !extra.integrado) throw new ErrorEpik(403, 'errors.epikIntegrado', 'ese id es de una plantilla de la app');
  escribirPaquete(manifest, archivos);
  const ahora = new Date().toISOString();
  registro[manifest.id] = { ...resumen(manifest, {}), importado: anterior?.importado || ahora, actualizado: ahora, versionAnterior: anterior?.version || null, ...extra };
  guardarRegistro(registro);
  return { epik: registro[manifest.id], actualizado: !!anterior };
}

const rutaIntegrado = (id) => path.join(RESOURCE_BASE, 'epik', INTEGRADOS[id]);

/** Instala o pone al dia las plantillas de la app en la cuenta activa (por hash: solo si cambio el archivo). */
function asegurarIntegrados(logger) {
  const registro = leerRegistro();
  for (const id of Object.keys(INTEGRADOS)) {
    try {
      const buffer = fs.readFileSync(rutaIntegrado(id));
      const hash = crypto.createHash('sha1').update(buffer).digest('hex');
      if (registro[id]?.hash === hash && fs.existsSync(carpetaPaquete(id))) continue;
      importar(buffer, null, { integrado: true, hash });
    } catch (error) {
      logger?.log('warn', 'epik', 'store#asegurarIntegrados', 'epik.integrado.fallo', `No se pudo instalar la plantilla ${id}`, { id, error: error.message });
    }
  }
}

/** Copia una plantilla de la app a la carpeta Descargas del usuario; devuelve la ruta (sin pisar archivos). */
function descargarIntegrado(id) {
  if (!INTEGRADOS[id]) throw new ErrorEpik(404, 'errors.epikNoEncontrado', 'solo se descargan las plantillas de la app');
  const carpetaDescargas = path.join(os.homedir(), 'Downloads');
  fs.mkdirSync(carpetaDescargas, { recursive: true });
  const { name, ext } = path.parse(INTEGRADOS[id]);
  let destino = path.join(carpetaDescargas, `${name}${ext}`);
  for (let n = 1; fs.existsSync(destino); n += 1) destino = path.join(carpetaDescargas, `${name} (${n})${ext}`);
  fs.copyFileSync(rutaIntegrado(id), destino);
  return destino;
}

function listar(overlay, logger) {
  asegurarIntegrados(logger);
  return Object.values(leerRegistro())
    .filter((epik) => !overlay || epik.overlay === familiaDe(overlay))
    .filter((epik) => fs.existsSync(carpetaPaquete(epik.id)))
    .sort((a, b) => String(b.actualizado).localeCompare(String(a.actualizado)));
}

function eliminar(id) {
  if (!ID_VALIDO.test(id || '')) throw new ErrorEpik(400, 'errors.epikNoEncontrado', 'id invalido');
  const registro = leerRegistro();
  if (!registro[id]) throw new ErrorEpik(404, 'errors.epikNoEncontrado', 'ese .epik no esta instalado');
  if (registro[id].integrado) throw new ErrorEpik(403, 'errors.epikIntegrado', 'la plantilla de prueba no se puede eliminar');
  fs.rmSync(carpetaPaquete(id), { recursive: true, force: true });
  delete registro[id];
  guardarRegistro(registro);
}

/** Ruta absoluta de un archivo de un paquete instalado, o null si se sale de su carpeta. */
function rutaArchivo(id, relativa) {
  if (!ID_VALIDO.test(id || '')) return null;
  const base = carpetaPaquete(id);
  const ruta = path.resolve(base, relativa || 'index.html');
  return ruta.startsWith(`${base}${path.sep}`) ? ruta : null;
}

module.exports = { importar, listar, eliminar, rutaArchivo, descargarIntegrado, ErrorEpik, FAMILIAS, OVERLAYS_SOPORTADOS };
