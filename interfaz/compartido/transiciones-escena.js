// Transiciones al cambiar de escena en el enlace de escena activa de OBS (y su prueba en el editor).
//
// La escena nueva se prepara en una capa propia (b) encima de la actual (a) y la transicion las mezcla a la vez, asi
// nunca queda un hueco vacio entre las dos. Cuatro familias:
//  - de movimiento (20): a sale y b entra con CSS (deslizar, zoom, giros, cortinas...).
//  - de mascara (34, estilo "luma wipe" de OBS): b se revela sobre a segun un campo (mascaras-transicion.js).
//  - fundido a color: un color cubre la pantalla, se cambia de escena y se descubre.
//  - stinger: una imagen o video cubre la pantalla y la escena cambia en el punto elegido.

import { TIPOS_MASCARA, campoDeMascara } from './mascaras-transicion.js';

const desliza = (x, y) => ({ transform: `translate(${x}, ${y})`, opacity: 0 });
const escala = (valor) => ({ transform: `scale(${valor})`, opacity: 0 });
const gira = (eje, grados) => ({ transform: `perspective(1200px) rotate${eje}(${grados}deg)`, opacity: 0 });
const recorte = (clipPath) => ({ clipPath });

// Estado "oculto" de la salida y, si difiere, de la entrada; el visible se deduce de las propiedades que usa.
export const TRANSICIONES = {
  fundido: { salida: { opacity: 0 } },
  'deslizar-izquierda': { salida: desliza('-100%', 0), entrada: desliza('100%', 0) },
  'deslizar-derecha': { salida: desliza('100%', 0), entrada: desliza('-100%', 0) },
  'deslizar-arriba': { salida: desliza(0, '-100%'), entrada: desliza(0, '100%') },
  'deslizar-abajo': { salida: desliza(0, '100%'), entrada: desliza(0, '-100%') },
  acercar: { salida: escala(1.4), entrada: escala(0.7) },
  alejar: { salida: escala(0.6), entrada: escala(1.4) },
  desenfoque: { salida: { filter: 'blur(24px)', opacity: 0 } },
  'voltear-h': { salida: gira('Y', -90), entrada: gira('Y', 90) },
  'voltear-v': { salida: gira('X', 90), entrada: gira('X', -90) },
  girar: { salida: { transform: 'rotate(-180deg) scale(0.3)', opacity: 0 }, entrada: { transform: 'rotate(180deg) scale(0.3)', opacity: 0 } },
  'cortina-izquierda': { salida: recorte('inset(0 100% 0 0)'), entrada: recorte('inset(0 0 0 100%)') },
  'cortina-derecha': { salida: recorte('inset(0 0 0 100%)'), entrada: recorte('inset(0 100% 0 0)') },
  'cortina-arriba': { salida: recorte('inset(0 0 100% 0)'), entrada: recorte('inset(100% 0 0 0)') },
  'cortina-abajo': { salida: recorte('inset(100% 0 0 0)'), entrada: recorte('inset(0 0 100% 0)') },
  persiana: { salida: recorte('inset(50% 0 50% 0)') },
  circulo: { salida: recorte('circle(0% at 50% 50%)') },
  diagonal: { salida: recorte('polygon(0 0, 0 0, 0 100%, 0 100%)'), entrada: recorte('polygon(100% 0, 100% 0, 100% 100%, 100% 100%)') },
  caer: { salida: { transform: 'translateY(60%) rotate(8deg)', opacity: 0 }, entrada: { transform: 'translateY(-60%) rotate(-8deg)', opacity: 0 } },
  inclinar: { salida: { transform: 'skewX(30deg) translateX(-40%)', opacity: 0 }, entrada: { transform: 'skewX(-30deg) translateX(40%)', opacity: 0 } },
};

export const TIPOS_MOVIMIENTO = Object.keys(TRANSICIONES);
export { TIPOS_MASCARA };
export const TIPOS_ESPECIALES = ['color', 'stinger'];
export const TIPOS_TRANSICION = [...TIPOS_MOVIMIENTO, ...TIPOS_MASCARA, ...TIPOS_ESPECIALES];
export const DURACION_TRANSICION = { min: 200, max: 1500, paso: 50, defecto: 600 };
export const STINGER_PUNTO = { min: 10, max: 90, paso: 5, defecto: 50 };
export const TRANSICION_POR_DEFECTO = { tipo: 'ninguna', duracion: DURACION_TRANSICION.defecto, invertir: false, color: '#000000', stinger: { src: '', punto: STINGER_PUNTO.defecto } };

// Valor de cada propiedad cuando la capa se ve entera (los recortes necesitan la misma funcion para interpolar).
const VISIBLE = { opacity: 1, transform: 'none', filter: 'blur(0px)' };
const recorteVisible = (valor) => {
  if (valor.startsWith('inset')) return 'inset(0 0 0 0)';
  if (valor.startsWith('circle')) return 'circle(75% at 50% 50%)';
  return 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
};
export const visibleDe = (oculto) => Object.fromEntries(Object.entries(oculto).map(([propiedad, valor]) => [propiedad, propiedad === 'clipPath' ? recorteVisible(valor) : VISIBLE[propiedad]]));

const EASING_SALIDA = 'cubic-bezier(0.4, 0, 1, 1)';
const EASING_ENTRADA = 'cubic-bezier(0.23, 1, 0.32, 1)';
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
// Una fuente oculta (OBS) deja de pintar y las animaciones no avanzan: el tiempo manda y, si vence, se sigue igual.
const hasta = (promesa, ms) => Promise.race([promesa.catch(() => {}), esperar(ms + 150)]);

async function movimiento(a, b, { tipo, duracion, invertir }) {
  const { salida, entrada = salida } = TRANSICIONES[tipo];
  const [fuera, dentro] = invertir ? [entrada, salida] : [salida, entrada];
  const saleA = a.animate([visibleDe(fuera), fuera], { duration: duracion, easing: EASING_SALIDA, fill: 'forwards' });
  const entraB = b.animate([dentro, visibleDe(dentro)], { duration: duracion, easing: EASING_ENTRADA });
  await hasta(Promise.all([saleA.finished, entraB.finished]), duracion);
  entraB.cancel();
  saleA.cancel();
}

// Mascara de baja resolucion: sus bordes se difuminan al escalarla, como los de OBS.
const MASCARA = { ancho: 160, alto: 90, borde: 0.18 };
const suavizar = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2);

async function mascara(a, b, { tipo, duracion, invertir }) {
  const { ancho, alto, borde } = MASCARA;
  const campo = campoDeMascara(tipo, ancho, alto);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext('2d');
  const imagen = contexto.createImageData(ancho, alto);
  imagen.data.fill(255);
  const pintar = (t) => {
    const progreso = suavizar(t) * (1 + borde);
    for (let i = 0; i < campo.length; i++) {
      const orden = invertir ? 1 - campo[i] : campo[i];
      imagen.data[i * 4 + 3] = Math.min(1, Math.max(0, (progreso - orden) / borde)) * 255;
    }
    contexto.putImageData(imagen, 0, 0);
    const url = `url(${lienzo.toDataURL()})`;
    b.style.webkitMaskImage = url;
    b.style.maskImage = url;
  };
  Object.assign(b.style, { webkitMaskSize: '100% 100%', maskSize: '100% 100%', webkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' });
  pintar(0);
  await hasta(new Promise((resolver) => {
    const inicio = performance.now();
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      pintar(t);
      if (t < 1) window.requestAnimationFrame(paso);
      else resolver();
    };
    window.requestAnimationFrame(paso);
  }), duracion);
  for (const propiedad of ['webkitMaskImage', 'maskImage', 'webkitMaskSize', 'maskSize', 'webkitMaskRepeat', 'maskRepeat']) b.style[propiedad] = '';
}

// Cambia de capa de golpe: b se ve y a se oculta.
const cortar = (a, b) => { a.style.visibility = 'hidden'; b.style.visibility = ''; };

async function fundidoAColor(a, b, { duracion, color }) {
  const velo = document.createElement('div');
  Object.assign(velo.style, { position: 'absolute', inset: '0', background: color, opacity: '0', pointerEvents: 'none' });
  b.style.visibility = 'hidden';
  b.after(velo);
  const mitad = Math.max(1, duracion / 2);
  await hasta(velo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: mitad, easing: EASING_SALIDA, fill: 'forwards' }).finished, mitad);
  cortar(a, b);
  await hasta(velo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: mitad, easing: EASING_ENTRADA, fill: 'forwards' }).finished, mitad);
  velo.remove();
}

const alListo = (medio, evento) => hasta(new Promise((resolver) => medio.addEventListener(evento, resolver, { once: true })), 1500);

async function stinger(a, b, { duracion, stinger: { src, punto } }) {
  const esVideo = /\.(mp4|webm)(?:$|[?#])/i.test(src);
  const medio = document.createElement(esVideo ? 'video' : 'img');
  Object.assign(medio.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' });
  if (esVideo) Object.assign(medio, { muted: true, playsInline: true });
  b.style.visibility = 'hidden';
  b.after(medio);
  medio.src = src;
  await alListo(medio, esVideo ? 'loadeddata' : 'load');
  const total = esVideo && Number.isFinite(medio.duration) ? medio.duration * 1000 : duracion;
  if (esVideo) medio.play().catch(() => {});
  else medio.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: total });
  await esperar(total * (punto / 100));
  cortar(a, b);
  await esperar(total * (1 - punto / 100));
  medio.remove();
}

/**
 * Mezcla la capa `a` (la escena actual) con `b` (la nueva, ya cargada) segun `opciones`:
 * { tipo, duracion (ms), invertir, color, stinger: { src, punto (%) } }. Al terminar, `b` queda visible y `a` oculta
 * (quien llama la quita). Un tipo desconocido corta directo.
 */
export async function transicionar(a, b, opciones) {
  const { tipo, invertir = false } = opciones;
  const comunes = { ...opciones, invertir };
  b.style.visibility = '';
  if (TRANSICIONES[tipo]) await movimiento(a, b, comunes);
  else if (TIPOS_MASCARA.includes(tipo)) await mascara(a, b, comunes);
  else if (tipo === 'color') await fundidoAColor(a, b, comunes);
  else if (tipo === 'stinger' && opciones.stinger?.src) await stinger(a, b, comunes);
  cortar(a, b);
}
