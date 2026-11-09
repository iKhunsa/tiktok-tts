'use strict';

// Selector de GIFs: se carga como `preload` en cada pagina del navegador de GIFs. Corre en el mundo JS
// AISLADO de Electron (contextIsolation): comparte el DOM con la pagina pero no sus variables, y no expone
// nada a ella (sin contextBridge). La pagina no puede llamar al IPC ni suplantar una seleccion; ademas solo
// se hace caso a eventos reales del usuario (isTrusted). Es un solo archivo porque un preload en sandbox no
// puede hacer require de modulos locales.
const { ipcRenderer, webFrame } = require('electron');

const ACENTO = '#F0213A';
const EXTENSIONES_ANIMADAS = /\.(gif|webp|apng)(?:$|[?#])/i;
const EXTENSIONES_VIDEO = /\.(mp4|webm)(?:$|[?#])/i;
const EVENTOS_A_INTERCEPTAR = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick', 'dblclick'];

let volumen = 50; // modo sonido: volumen de la ventana (0-100), el mismo para la pagina y para la vista previa
let modo = 'gif'; // 'sonido': detecta audios (botones de sonido, <audio>, enlaces a mp3...) en vez de GIFs
let textos = { agregar: 'Add to TikLiveTTS', cancelar: 'Cancel', pausar: 'Pause selection', activar: 'Resume selection', agregando: 'Adding…', agregado: 'Added to My GIFs', duplicado: 'Already in My GIFs', error: 'Could not add it', errores: {}, etiquetaVolumen: 'Window volume', avisoVolumen: 'Protect your hearing: some sounds are very loud.' };
let anfitrion = null; // <div> con shadow DOM: marco de resalte y tarjeta, aislados de los estilos de la pagina
let sombra = null;
let marco = null;
let tarjeta = null;
let objetivo = null; // { el, url, tipo } bajo el cursor
let cuadro = 0;
let activo = true; // false: el selector no resalta ni intercepta, la pagina se usa normal
let interruptor = null;

// ── deteccion ───────────────────────────────────────────────────────────────
const absoluta = (valor) => {
  try {
    const url = new URL(valor, document.baseURI);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch (_) { return null; }
};

function urlDeFondo(el) {
  const fondo = getComputedStyle(el).backgroundImage;
  const coincide = fondo && fondo !== 'none' && fondo.match(/url\(["']?(.*?)["']?\)/);
  return coincide ? absoluta(coincide[1]) : null;
}

// Un <picture> puede declarar el formato animado en un <source> aunque el <img> no tenga extension.
const declaraAnimado = (img) => !!img.closest('picture')?.querySelector('source[type="image/gif"], source[type="image/webp"], source[type="image/apng"]');

const EXTENSIONES_AUDIO = /.(mp3|wav|ogg|m4a|flac)(?:$|[?#])/i;
const AUDIO_EN_ONCLICK = /['"]([^'"]+.(?:mp3|wav|ogg|m4a|flac)(?:[?#][^'"]*)?)['"]/i;

/** Modo sonido: un <audio>, un enlace directo a un archivo de audio o un boton cuyo onclick reproduce uno (MyInstants: play('/media/sounds/x.mp3')). */
function candidatoAudio(el) {
  if (el.tagName === 'AUDIO') {
    const url = absoluta(el.currentSrc || el.src || el.querySelector('source')?.src);
    return url && EXTENSIONES_AUDIO.test(url) ? { el, url, tipo: 'audio' } : null;
  }
  if (el.tagName === 'A') {
    const url = absoluta(el.getAttribute('href') || '');
    if (url && EXTENSIONES_AUDIO.test(url)) return { el, url, tipo: 'audio' };
  }
  const coincide = el.getAttribute?.('onclick')?.match(AUDIO_EN_ONCLICK);
  const url = coincide && absoluta(coincide[1]);
  return url ? { el, url, tipo: 'audio' } : null;
}

/** Si el elemento es una imagen animada o un video en bucle, devuelve { el, url, tipo }; si no, null. */
function candidato(el) {
  if (modo === 'sonido') return candidatoAudio(el);
  if (el.tagName === 'IMG') {
    const url = absoluta(el.currentSrc || el.src);
    if (url && (EXTENSIONES_ANIMADAS.test(url) || declaraAnimado(el))) return { el, url, tipo: 'imagen' };
    return null;
  }
  if (el.tagName === 'VIDEO') {
    const fuente = el.currentSrc || el.src || el.querySelector('source')?.src;
    const url = fuente && absoluta(fuente);
    // Un video en bucle (autoplay silencioso o con loop) es como se sirve un "gif" en GIPHY o Tenor.
    if (url && EXTENSIONES_VIDEO.test(url) && (el.loop || (el.autoplay && el.muted))) return { el, url, tipo: 'video' };
    return null;
  }
  const fondo = urlDeFondo(el);
  return fondo && EXTENSIONES_ANIMADAS.test(fondo) ? { el, url: fondo, tipo: 'imagen' } : null;
}

// Lo que hay bajo el puntero, de arriba abajo: asi un enlace transparente encima de un GIF no lo oculta.
function candidatoEn(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el === anfitrion) return null; // sobre nuestra propia tarjeta
    const encontrado = candidato(el);
    if (encontrado) return encontrado;
    // Un contenedor cuyo unico contenido es un medio animado (tarjetas de resultados) cuenta como ese medio.
    const unico = el.children.length === 1 && el.children[0];
    if (unico && (unico.tagName === 'IMG' || unico.tagName === 'VIDEO')) {
      const interior = candidato(unico);
      if (interior) return interior;
    }
  }
  return null;
}

// ── interfaz aislada ────────────────────────────────────────────────────────
// Estilos por propiedad, no con <style>: una CSP estricta de la pagina bloquearia el estilo en linea.
const estilo = (el, props) => { Object.assign(el.style, props); return el; };
const crear = (etiqueta, props, texto) => {
  const el = estilo(document.createElement(etiqueta), props || {});
  if (texto) el.textContent = texto;
  return el;
};

function montar() {
  if (anfitrion) return;
  anfitrion = estilo(document.createElement('div'), { all: 'initial', position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
  sombra = anfitrion.attachShadow({ mode: 'closed' });
  marco = estilo(document.createElement('div'), {
    position: 'fixed', display: 'none', boxSizing: 'border-box', border: `3px solid ${ACENTO}`, borderRadius: '6px', pointerEvents: 'none',
    boxShadow: '0 0 0 1px rgba(255,255,255,.6)',
  });
  sombra.append(marco);
  montarInterruptor();
  if (modo === 'sonido') montarVolumen();
  (document.documentElement || document).append(anfitrion);
}

// Boton flotante: pausa el selector para moverse por la pagina sin el marco rojo ni el clic interceptado.
function montarInterruptor() {
  interruptor = crear('button', {
    all: 'unset', boxSizing: 'border-box', position: 'fixed', right: '16px', bottom: '16px', cursor: 'pointer', padding: '8px 14px', borderRadius: '999px',
    font: '600 12px system-ui, sans-serif', color: '#fff', pointerEvents: 'auto', boxShadow: '0 4px 14px rgba(0,0,0,.45)',
  });
  interruptor.addEventListener('click', (evento) => { if (evento.isTrusted) alternar(); });
  sombra.append(interruptor);
  pintarInterruptor();
}
function pintarInterruptor() {
  interruptor.textContent = activo ? textos.pausar : textos.activar;
  estilo(interruptor, { background: activo ? ACENTO : '#3a3a3a' });
}
function alternar() {
  activo = !activo;
  if (!activo) { objetivo = null; cerrarTarjeta(); pedirMarco(); }
  pintarInterruptor();
}

// Se ejecuta en el mundo de la pagina (no en el aislado del selector): baja el volumen de todo lo que suene en ella,
// sean <audio>/<video>, Audio() creados por la pagina o Web Audio. Es una funcion normal que se envia como texto.
function parcheVolumen(porcentaje) {
  const v = porcentaje / 100;
  const estado = window.__tlttsVolumen || (window.__tlttsVolumen = { v, gains: new Set(), parcheado: false });
  estado.v = v;
  if (!estado.parcheado) {
    estado.parcheado = true;
    const play = window.HTMLMediaElement.prototype.play;
    window.HTMLMediaElement.prototype.play = function reproducir(...args) { this.volume = estado.v; return play.apply(this, args); };
    const base = window.BaseAudioContext && Object.getOwnPropertyDescriptor(window.BaseAudioContext.prototype, 'destination');
    if (base && base.get) {
      Object.defineProperty(window.BaseAudioContext.prototype, 'destination', {
        configurable: true,
        get() {
          if (!this.__tlttsGain) {
            const ganancia = this.createGain();
            ganancia.gain.value = estado.v;
            ganancia.connect(base.get.call(this));
            estado.gains.add(ganancia);
            this.__tlttsGain = ganancia;
          }
          return this.__tlttsGain;
        },
      });
    }
  }
  document.querySelectorAll('audio, video').forEach((medio) => { try { medio.volume = estado.v; } catch (_) { /* sin volumen */ } });
  estado.gains.forEach((ganancia) => { ganancia.gain.value = estado.v; });
}
const aplicarVolumenPagina = (porcentaje) => webFrame.executeJavaScript(`(${parcheVolumen})(${Number(porcentaje)})`).catch(() => {});

// Volumen de la ventana, encima de "Pausar seleccion": hay sonidos muy fuertes y asi se cuida el oido del usuario.
function montarVolumen() {
  const panel = crear('div', {
    position: 'fixed', right: '16px', bottom: '58px', width: '236px', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '12px',
    background: '#1a1a1a', border: '1px solid #2e2e2e', boxShadow: '0 4px 14px rgba(0,0,0,.45)', font: '12px system-ui, sans-serif',
    color: '#fff', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
  });
  const valor = crear('span', {}, `${volumen}%`);
  const cabecera = crear('div', { display: 'flex', justifyContent: 'space-between', fontWeight: '600' });
  cabecera.append(crear('span', {}, textos.etiquetaVolumen), valor);
  const control = crear('input', { width: '100%', margin: '0', accentColor: ACENTO, cursor: 'pointer' });
  Object.assign(control, { type: 'range', min: '0', max: '100', step: '1', value: String(volumen) });
  control.addEventListener('input', (evento) => {
    if (!evento.isTrusted) return;
    volumen = Number(control.value);
    valor.textContent = `${volumen}%`;
    aplicarVolumenPagina(volumen);
    const prueba = tarjeta?.querySelector('audio');
    if (prueba) prueba.volume = volumen / 100;
    ipcRenderer.invoke('gifbrowser:volumen', { volumen }).catch(() => {});
  });
  panel.append(cabecera, control, crear('div', { color: 'rgba(255,255,255,.65)', lineHeight: '1.35' }, textos.avisoVolumen));
  sombra.append(panel);
}

function mostrarMarco() {
  cuadro = 0;
  if (!objetivo || !objetivo.el.isConnected) { marco.style.display = 'none'; return; }
  const r = objetivo.el.getBoundingClientRect();
  estilo(marco, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
}
const pedirMarco = () => { if (!cuadro) cuadro = requestAnimationFrame(mostrarMarco); };

function cerrarTarjeta() {
  tarjeta?.remove();
  tarjeta = null;
}

function boton(texto, principal, alPulsar) {
  const b = crear('button', {
    all: 'unset', boxSizing: 'border-box', cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', font: '600 13px system-ui, sans-serif',
    background: principal ? ACENTO : 'rgba(255,255,255,.1)', color: '#fff', textAlign: 'center', pointerEvents: 'auto',
  }, texto);
  b.addEventListener('click', (evento) => { if (evento.isTrusted) alPulsar(); });
  return b;
}

function mensajeDeError(resultado) {
  return textos.errores[resultado.codigo] || textos.error;
}

async function importar(destino, estado, acciones) {
  estado.textContent = textos.agregando;
  acciones.replaceChildren();
  const resultado = await ipcRenderer.invoke('gifbrowser:importar', { url: destino.url, titulo: document.title, origen: location.href }).catch(() => ({ ok: false }));
  if (!tarjeta) return;
  if (resultado.ok) {
    estado.textContent = resultado.duplicado ? textos.duplicado : textos.agregado;
    estilo(estado, { color: '#7ee787' });
    setTimeout(cerrarTarjeta, 1500);
  } else {
    estado.textContent = mensajeDeError(resultado);
    estilo(estado, { color: '#ff7b72' });
    acciones.replaceChildren(boton(textos.cancelar, false, cerrarTarjeta));
  }
}

/** Tarjeta flotante junto al clic: vista previa del medio y el boton para anadirlo. */
function abrirTarjeta(destino, x, y) {
  cerrarTarjeta();
  const vista = destino.tipo === 'audio'
    ? crear('audio', { width: '240px', display: 'block' })
    : crear(destino.tipo === 'video' ? 'video' : 'img', { maxWidth: '240px', maxHeight: '160px', borderRadius: '8px', display: 'block' });
  vista.src = destino.url;
  if (destino.tipo === 'audio') { vista.controls = true; vista.autoplay = true; vista.volume = volumen / 100; }
  if (destino.tipo === 'video') { vista.muted = true; vista.loop = true; vista.autoplay = true; }
  const estado = crear('div', { font: '12px system-ui, sans-serif', color: 'rgba(255,255,255,.7)', minHeight: '16px' });
  const acciones = crear('div', { display: 'flex', gap: '8px' });
  acciones.append(boton(textos.agregar, true, () => importar(destino, estado, acciones)), boton(textos.cancelar, false, cerrarTarjeta));
  tarjeta = estilo(crear('div'), {
    position: 'fixed', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '14px', boxSizing: 'border-box',
    background: '#1a1a1a', border: '1px solid #2e2e2e', boxShadow: '0 12px 32px rgba(0,0,0,.5)', pointerEvents: 'auto', maxWidth: '264px',
  });
  tarjeta.append(vista, estado, acciones);
  sombra.append(tarjeta);
  const t = tarjeta.getBoundingClientRect();
  estilo(tarjeta, {
    left: `${Math.max(8, Math.min(x + 12, window.innerWidth - t.width - 8))}px`,
    top: `${Math.max(8, Math.min(y + 12, window.innerHeight - t.height - 8))}px`,
  });
}

// ── eventos ────────────────────────────────────────────────────────────────
function alMover(evento) {
  if (!activo || !evento.isTrusted) return;
  const nuevo = candidatoEn(evento.clientX, evento.clientY);
  if (nuevo?.el !== objetivo?.el) { objetivo = nuevo; pedirMarco(); }
}

// Sobre un GIF detectado el clic no navega ni activa el enlace: abre la tarjeta. Fuera de uno, la pagina funciona igual.
function alClic(evento) {
  if (!activo || !evento.isTrusted) return;
  const destino = candidatoEn(evento.clientX, evento.clientY);
  if (!destino) { if (tarjeta && !evento.composedPath().includes(anfitrion)) cerrarTarjeta(); return; }
  evento.preventDefault();
  evento.stopImmediatePropagation();
  abrirTarjeta(destino, evento.clientX, evento.clientY);
}

function alOtroEvento(evento) {
  if (activo && evento.isTrusted && candidatoEn(evento.clientX, evento.clientY)) {
    evento.preventDefault();
    evento.stopImmediatePropagation();
  }
}

async function iniciar() {
  textos = { ...textos, ...(await ipcRenderer.invoke('gifbrowser:textos').catch(() => ({}))) };
  modo = textos.modo === 'sonido' ? 'sonido' : 'gif';
  if (Number.isFinite(textos.volumen)) volumen = textos.volumen;
  if (modo === 'sonido') aplicarVolumenPagina(volumen);
  montar();
  pintarInterruptor(); // los textos traducidos llegan antes de montar
  window.addEventListener('mousemove', alMover, true);
  window.addEventListener('scroll', pedirMarco, true);
  window.addEventListener('resize', pedirMarco, true);
  window.addEventListener('click', alClic, true);
  for (const nombre of EVENTOS_A_INTERCEPTAR) window.addEventListener(nombre, alOtroEvento, true);
  window.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') cerrarTarjeta(); }, true);
  document.addEventListener('mouseleave', () => { objetivo = null; pedirMarco(); }, true);
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', iniciar, { once: true });
else iniciar();
