'use strict';

const { validarUrl } = require('./validar-url');

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_SALTOS = 3;
const TIMEOUT_MS = 15000;

// Estados con los que un sitio dice "esto no se puede tomar": se informan, no se intentan eludir.
const RESTRINGIDO = new Set([401, 403, 429]);

/**
 * Descarga un medio con tope de tamano y de tiempo. Sigue las redirecciones a mano para validar cada
 * destino (una redireccion no puede llevar a la red interna) y no envia cookies ni cabeceras de otro
 * origen: pide el archivo como lo haria cualquiera.
 */
async function descargar(entrada, { fetchFn = fetch, validar = validarUrl, accept = 'image/*,video/*;q=0.8' } = {}) {
  const falla = (codigo) => Object.assign(new Error(codigo), { codigo });
  let url = await validar(entrada);
  for (let salto = 0; salto <= MAX_SALTOS; salto += 1) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), TIMEOUT_MS);
    try {
      const respuesta = await fetchFn(url, { redirect: 'manual', signal: control.signal, headers: { Accept: accept } });
      if (respuesta.status >= 300 && respuesta.status < 400 && respuesta.headers.get('location')) {
        url = await validar(new URL(respuesta.headers.get('location'), url).href);
        continue;
      }
      if (RESTRINGIDO.has(respuesta.status)) throw falla('sitio_restringe');
      if (respuesta.status === 404 || respuesta.status === 410) throw falla('enlace_caducado');
      if (!respuesta.ok) throw falla('descarga_fallida');
      const declarado = Number(respuesta.headers.get('content-length'));
      if (declarado > MAX_BYTES) throw falla('muy_grande');
      const trozos = [];
      let total = 0;
      for await (const trozo of respuesta.body) {
        total += trozo.length;
        if (total > MAX_BYTES) throw falla('muy_grande');
        trozos.push(trozo);
      }
      return { url, bytes: Buffer.concat(trozos) };
    } catch (error) {
      if (error.codigo) throw error;
      throw falla(error.name === 'AbortError' ? 'tiempo_agotado' : 'descarga_fallida');
    } finally {
      clearTimeout(reloj);
    }
  }
  throw falla('demasiadas_redirecciones');
}

module.exports = { descargar, MAX_BYTES };
