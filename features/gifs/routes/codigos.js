'use strict';

// Codigo de error de la biblioteca -> estado HTTP. El cliente traduce el codigo (gifs.error.<codigo>).
const ESTADOS = {
  url_invalida: 400, url_privada: 400, url_inalcanzable: 502, formato_incompatible: 422, no_animado: 422,
  sitio_restringe: 422, enlace_caducado: 422, muy_grande: 413, tiempo_agotado: 504, descarga_fallida: 502,
  demasiadas_redirecciones: 502, no_encontrado: 404, carpeta_invalida: 400, nombre_invalido: 400, nombre_repetido: 409,
};

function responderError(res, error) {
  const codigo = error.codigo && ESTADOS[error.codigo] ? error.codigo : 'descarga_fallida';
  return res.status(ESTADOS[codigo]).json({ error: codigo, codigo });
}

module.exports = { responderError, ESTADOS };
