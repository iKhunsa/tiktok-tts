import { aplicarCroma, hexARgb } from './estilo/croma.js';

const LADO_PX = 64; // medida por defecto del hueco de la imagen de una alerta (icono, regalo o foto)
const LADO_MAX_LIENZO = 480; // el croma trabaja sobre una copia reducida: a mas pixeles, mas coste por cuadro
const RADIO_DEFECTO = 22;
const RELLENO_TARJETA_PX = 38; // 18 de relleno por lado + 1 de borde por lado // % del lado menor; en 64 px son los 14 px de siempre
const medida = (valor) => (Number.isFinite(valor) && valor > 0 ? valor : LADO_PX);

// Las tarjetas de alerta tienen un ancho fijo (body) pensado para una imagen de LADO_PX: con un GIF mas ancho el
// texto se comprimiria. La tarjeta crece lo que crece la imagen, asi el texto conserva el espacio que tenia.
let anchoBase = null;
function ajustarAnchoDeLaTarjeta(ancho, textoDebajo) {
  anchoBase ??= parseFloat(window.getComputedStyle(document.body).width) || 440;
  // Texto al lado: la tarjeta crece lo que el GIF. Texto debajo: solo lo justo para que el GIF quepa (relleno y borde incluidos).
  document.body.style.width = `${textoDebajo ? Math.max(anchoBase, ancho + RELLENO_TARJETA_PX) : anchoBase + Math.max(0, ancho - LADO_PX)}px`;
}

function crearMedio(src, esVideo, estilo) {
  const medio = document.createElement(esVideo ? 'video' : 'img');
  medio.className = 'gif-alerta';
  if (esVideo) Object.assign(medio, { autoplay: true, loop: true, muted: true, playsInline: true });
  else medio.alt = '';
  medio.src = src;
  Object.assign(medio.style, estilo);
  return medio;
}

/**
 * Croma: el GIF se dibuja en un canvas cuadro a cuadro quitando el color de fondo. Si el sitio de origen no
 * deja leer sus pixeles (sin cabeceras CORS el navegador lo impide), se muestra el GIF tal cual en vez de nada.
 */
function crearConCroma({ src, esVideo, estilo, clave, tolerancia }) {
  const lienzo = document.createElement('canvas');
  lienzo.className = 'gif-alerta';
  Object.assign(lienzo.style, estilo);
  const contexto = lienzo.getContext('2d', { willReadFrequently: true });
  // La fuente se mantiene en la pagina, invisible: un GIF fuera del documento puede dejar de animarse.
  const fuente = document.createElement(esVideo ? 'video' : 'img');
  fuente.crossOrigin = 'anonymous';
  if (esVideo) Object.assign(fuente, { autoplay: true, loop: true, muted: true, playsInline: true });
  Object.assign(fuente.style, { position: 'fixed', left: '-9999px', top: '0', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
  document.body.append(fuente);
  let activo = true;
  let visto = false;
  const terminar = () => { activo = false; fuente.remove(); };
  const sinCroma = () => { terminar(); lienzo.replaceWith(crearMedio(src, esVideo, estilo)); };

  const dibujar = () => {
    if (!activo) return;
    if (lienzo.isConnected) visto = true;
    else if (visto) { terminar(); return; } // la alerta ya se retiro
    const ancho = esVideo ? fuente.videoWidth : fuente.naturalWidth;
    const alto = esVideo ? fuente.videoHeight : fuente.naturalHeight;
    if (ancho && alto) {
      const reduccion = Math.min(1, LADO_MAX_LIENZO / Math.max(ancho, alto));
      const lienzoAncho = Math.max(1, Math.round(ancho * reduccion));
      if (lienzo.width !== lienzoAncho) { lienzo.width = lienzoAncho; lienzo.height = Math.max(1, Math.round(alto * reduccion)); }
      try {
        contexto.drawImage(fuente, 0, 0, lienzo.width, lienzo.height);
        const cuadro = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
        aplicarCroma(cuadro.data, clave, tolerancia);
        contexto.putImageData(cuadro, 0, 0);
      } catch (_) {
        sinCroma(); // canvas "tainted": no se pueden leer los pixeles de otro origen
        return;
      }
    }
    requestAnimationFrame(dibujar);
  };
  fuente.addEventListener('error', sinCroma);
  fuente.src = src;
  requestAnimationFrame(dibujar);
  return lienzo;
}

/**
 * GIF o foto elegidos en el editor de canvas como imagen de la alerta (param `gif` de la URL). Devuelve el
 * elemento listo para ocupar el hueco de la imagen, o null si no hay GIF o la direccion no es http(s) (nunca
 * se carga otra cosa). Un video en bucle (GIPHY, Tenor) se acepta igual que un GIF. Ancho, alto, redondeo y
 * croma salen de `cfg` (gifAncho, gifAlto, gifRadio, gifCroma, gifCromaTol).
 */
export function crearImagenGifAlerta(src, cfg = {}) {
  if (typeof src !== 'string' || !/^https?:\/\//i.test(src)) return null;
  const esVideo = /\.(mp4|webm)(?:$|[?#])/i.test(src);
  const ancho = medida(cfg.gifAncho);
  const alto = medida(cfg.gifAlto);
  const radio = Number.isFinite(cfg.gifRadio) ? cfg.gifRadio : RADIO_DEFECTO;
  ajustarAnchoDeLaTarjeta(ancho, cfg.posicionTexto === 'debajo');
  const estilo = { flexShrink: '0', width: `${ancho}px`, height: `${alto}px`, objectFit: 'cover', borderRadius: `${(Math.min(ancho, alto) * radio) / 100}px` };
  const clave = hexARgb(cfg.gifCroma);
  return clave
    ? crearConCroma({ src, esVideo, estilo, clave, tolerancia: Number.isFinite(cfg.gifCromaTol) ? cfg.gifCromaTol : 40 })
    : crearMedio(src, esVideo, estilo);
}
