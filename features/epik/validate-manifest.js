'use strict';

/**
 * Familias de .epik: `manifest.overlay` nombra la familia y el diseno sirve en todos sus overlays
 * (reciben los mismos datos). Habilitar una familia = agregarla aqui; la UI lo lee de GET /api/epik.
 */
const FAMILIAS = {
  musica: ['musica'],
  ranking: ['likes', 'donadores'],
  contador: ['seguidores', 'viewers', 'contador-likes'],
  // Las de EVENTOS_ALERTA (interfaz/compartido/eventos-alerta.js); test/epik-familias.test.js vigila que coincidan.
  alerta: ['alertas', 'alertas-social', 'nuevo-seguidor', 'compartido', 'entrada', 'bits', 'kicks', 'superchat', 'supersticker',
    'suscripcion', 'renovacion', 'fin-directo'],
  // Una sola pagina (overlay-chat.html); los de una plataforma la fijan en la URL.
  chat: ['chat', 'chat-tiktok', 'chat-twitch', 'chat-youtube', 'chat-kick'],
  creditos: ['creditos'],
  social: ['social'],
};
const OVERLAYS_SOPORTADOS = Object.values(FAMILIAS).flat();
/** Familia a la que pertenece un overlay (id del acordeon), o null si ese overlay no acepta .epik. */
const familiaDe = (overlay) => Object.keys(FAMILIAS).find((familia) => FAMILIAS[familia].includes(overlay)) || null;
// Mismo patron que interfaz/compartido/epik/skin-epik.js (el id viaja en la skin `epik:<id>`).
const ID_VALIDO = /^[a-z0-9][a-z0-9-]{2,47}$/;
const OVERLAY_VALIDO = /^[a-z][a-z0-9-]{1,29}$/;
const CLAVE_VALIDA = /^[a-zA-Z][a-zA-Z0-9]{0,31}$/;
const COLOR_VALIDO = /^#[0-9a-fA-F]{6}$/;
const TIPOS = ['color', 'bool', 'numero', 'opcion', 'texto'];
const MAX_CAMPOS = 40;
const MAX_OPCIONES = 30;

class ManifestInvalido extends Error {}
const falla = (motivo) => { throw new ManifestInvalido(motivo); };

function texto(valor, max, nombre, { requerido = false } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (requerido) falla(`falta ${nombre}`);
    return undefined;
  }
  if (typeof valor !== 'string' || valor.length > max) falla(`${nombre} invalido (texto de hasta ${max})`);
  return valor.trim();
}

const IDIOMA_VALIDO = /^[a-z]{2}(-[A-Z]{2})?$/;
const MAX_IDIOMAS = 20;

/** Texto visible para el streamer: uno solo o traducido { es: '...', en: '...' } (la app elige su idioma). */
function textoTraducible(valor, max, nombre, opciones) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return texto(valor, max, nombre, opciones);
  const idiomas = Object.keys(valor);
  if (!idiomas.length || idiomas.length > MAX_IDIOMAS || !idiomas.every((idioma) => IDIOMA_VALIDO.test(idioma))) {
    falla(`${nombre}: usa codigos de idioma como "es", "en", "pt" (hasta ${MAX_IDIOMAS})`);
  }
  return Object.fromEntries(idiomas.map((idioma) => [idioma, texto(valor[idioma], max, `${nombre}.${idioma}`, { requerido: true })]));
}

function numero(valor, nombre) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) falla(`${nombre} debe ser un numero`);
  return valor;
}

function validarCampo(campo, indice) {
  const donde = `campos[${indice}]`;
  if (!campo || typeof campo !== 'object') falla(`${donde} no es un objeto`);
  if (!CLAVE_VALIDA.test(campo.clave || '')) falla(`${donde}.clave invalida (letras y numeros, empieza con letra)`);
  if (!TIPOS.includes(campo.tipo)) falla(`${donde}.tipo debe ser ${TIPOS.join(', ')}`);
  const limpio = { clave: campo.clave, tipo: campo.tipo, etiqueta: textoTraducible(campo.etiqueta, 40, `${donde}.etiqueta`, { requerido: true }) };
  const ayuda = textoTraducible(campo.ayuda, 120, `${donde}.ayuda`);
  if (ayuda) limpio.ayuda = ayuda;

  if (campo.tipo === 'color') {
    if (!COLOR_VALIDO.test(campo.def || '')) falla(`${donde}.def debe ser un color #rrggbb`);
    limpio.def = campo.def.toLowerCase();
  } else if (campo.tipo === 'bool') {
    if (typeof campo.def !== 'boolean') falla(`${donde}.def debe ser true o false`);
    limpio.def = campo.def;
  } else if (campo.tipo === 'numero') {
    limpio.min = numero(campo.min, `${donde}.min`);
    limpio.max = numero(campo.max, `${donde}.max`);
    limpio.step = campo.step === undefined ? 1 : numero(campo.step, `${donde}.step`);
    limpio.def = numero(campo.def, `${donde}.def`);
    if (limpio.min >= limpio.max || limpio.step <= 0 || limpio.def < limpio.min || limpio.def > limpio.max) falla(`${donde}: min < def < max y step > 0`);
    if (campo.porcentaje === true) limpio.porcentaje = true;
    limpio.ui = 'rango';
  } else if (campo.tipo === 'opcion') {
    const { opciones } = campo;
    if (!Array.isArray(opciones) || !opciones.length || opciones.length > MAX_OPCIONES) falla(`${donde}.opciones: lista de 1 a ${MAX_OPCIONES}`);
    limpio.opciones = opciones.map((opcion, n) => texto(opcion, 40, `${donde}.opciones[${n}]`, { requerido: true }));
    if (!limpio.opciones.includes(campo.def)) falla(`${donde}.def debe ser una de sus opciones`);
    limpio.def = campo.def;
    if (campo.etiquetasOpciones !== undefined) {
      if (!Array.isArray(campo.etiquetasOpciones) || campo.etiquetasOpciones.length !== opciones.length) falla(`${donde}.etiquetasOpciones debe tener una por opcion`);
      limpio.etiquetasOpciones = campo.etiquetasOpciones.map((etiqueta, n) => textoTraducible(etiqueta, 40, `${donde}.etiquetasOpciones[${n}]`, { requerido: true }));
    }
  } else {
    limpio.max = Math.min(Number.isInteger(campo.max) ? campo.max : 200, 200);
    limpio.def = campo.def === undefined ? '' : texto(campo.def, limpio.max, `${donde}.def`) ?? '';
  }
  return limpio;
}

function validarMedida(medida) {
  const lado = (valor, nombre) => {
    if (!Number.isInteger(valor) || valor < 40 || valor > 3840) falla(`medida.${nombre} debe ser un entero entre 40 y 3840`);
    return valor;
  };
  if (!medida || typeof medida !== 'object') falla('falta medida { ancho, alto }');
  return { ancho: lado(medida.ancho, 'ancho'), alto: lado(medida.alto, 'alto') };
}

/**
 * Valida el manifest.json de un .epik y devuelve una copia limpia (sin claves desconocidas).
 * `existe(ruta)` dice si un archivo viene en el paquete. Lanza ManifestInvalido con el motivo.
 */
function validarManifest(manifest, existe) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) falla('manifest.json no es un objeto');
  if (manifest.formato !== 'epik') falla('formato debe ser "epik"');
  if (manifest.sdk !== 1) falla('sdk debe ser 1');
  if (!ID_VALIDO.test(manifest.id || '')) falla('id invalido (minusculas, numeros y guiones, 3 a 48)');
  if (!OVERLAY_VALIDO.test(manifest.overlay || '')) falla('overlay invalido');
  const entrada = texto(manifest.entrada, 80, 'entrada') || 'index.html';
  if (!entrada.endsWith('.html') || !existe(entrada)) falla(`no esta el archivo de entrada ${entrada}`);
  const preview = texto(manifest.preview, 80, 'preview');
  if (preview && !existe(preview)) falla(`no esta la miniatura ${preview}`);
  const campos = manifest.campos ?? [];
  if (!Array.isArray(campos) || campos.length > MAX_CAMPOS) falla(`campos: lista de hasta ${MAX_CAMPOS}`);
  const limpios = campos.map(validarCampo);
  const claves = new Set(limpios.map(({ clave }) => clave));
  if (claves.size !== limpios.length) falla('hay dos campos con la misma clave');

  return {
    formato: 'epik',
    sdk: 1,
    id: manifest.id,
    overlay: manifest.overlay,
    nombre: texto(manifest.nombre, 60, 'nombre', { requerido: true }),
    version: texto(manifest.version, 20, 'version', { requerido: true }),
    autor: texto(manifest.autor, 60, 'autor') || 'Epik',
    descripcion: texto(manifest.descripcion, 200, 'descripcion') || '',
    entrada,
    preview: preview || null,
    medida: validarMedida(manifest.medida),
    campos: limpios,
  };
}

module.exports = { validarManifest, ManifestInvalido, FAMILIAS, OVERLAYS_SOPORTADOS, familiaDe, ID_VALIDO };
