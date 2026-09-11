/**
 * Lectura de querystring de un overlay. Reemplaza las 5 copias de
 * intParam(name, def) y el parseo repetido de color/bg/bgimg en los 7
 * overlays (overlay-alertas, overlay-alertas-social, overlay-chat,
 * overlay-creditos, overlay-likes, overlay-seguidores, overlay-social).
 */
export function leerParametros() {
  return new URLSearchParams(location.search);
}

export function intParam(params, name, def) {
  const n = parseInt(params.get(name), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export function strParam(params, name, def) {
  const v = params.get(name);
  return v === null || v === '' ? def : v;
}

export function boolParam(params, name, def) {
  const v = params.get(name);
  if (v === null) return def;
  return v === '1' || v === 'true';
}

/**
 * Aplica color/bg/bgimg de la querystring a las custom properties del
 * overlay. Es el parseo que estaba duplicado literalmente en los 7 overlays.
 */
export function aplicarParametrosVisuales(params) {
  const color = params.get('color');
  if (color) document.documentElement.style.setProperty('--accent', '#' + color);

  const bg = params.get('bg');
  if (bg) document.documentElement.style.setProperty('--bg-alpha', bg);

  const bgimg = params.get('bgimg');
  if (bgimg) {
    document.documentElement.style.setProperty('--bg-img', `url('${bgimg}')`);
    document.body.classList.add('has-bgimg');
  }
}
