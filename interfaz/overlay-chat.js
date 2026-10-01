import { leerParametros } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml, escaparAtributo } from './compartido/escapar-html.js';
import { leerConfig } from './compartido/estilo/query.js';
import { ESQUEMAS } from './compartido/estilo/esquemas.js';
import { aplicarTipografia } from './compartido/estilo/aplicar-tipografia.js';
import { estilizarTexto } from './compartido/estilo/estilizar-texto.js';

registrarErroresOverlay();

const PLATFORM_LABEL = { tiktok: 'T', twitch: 'W', youtube: 'Y', kick: 'K' };
const ROLES = ['viewer', 'moderador', 'suscriptor'];
const SALIDA_MS = 300;

const params = leerParametros();
const cfg = leerConfig(ESQUEMAS.chat, params);
const roles = Object.fromEntries(ROLES.map((rol) => [rol, leerRol(rol)]));
const container = document.getElementById('chat-container');

aplicarConfigGlobal();

function leerRol(rol) {
  const campo = (nombre) => cfg[`${rol}${nombre}`];
  return {
    mostrar: campo('Mostrar'),
    colorUsuario: campo('ColorUsuario'),
    efecto: campo('Efecto'),
    ola: campo('Ola'),
    resplandor: campo('Resplandor'),
    colorComentario: campo('ColorComentario'),
    colorFondo: campo('ColorFondo'),
  };
}

function aplicarConfigGlobal() {
  aplicarTipografia(cfg);
  document.documentElement.style.setProperty('--bg-alpha', String(cfg.bg));
  document.body.classList.toggle('rtl', cfg.derechaAIzquierda);
  document.body.classList.toggle('single', cfg.unaLinea);
  document.body.classList.toggle('fit', cfg.ajustarAncho);
}

const rolDe = (mensaje) => {
  if (mensaje.isModerator) return 'moderador';
  return mensaje.isSubscriber ? 'suscriptor' : 'viewer';
};

// Color estable por nombre: el mismo usuario siempre sale del mismo tono.
function colorAleatorioDe(usuario) {
  const tono = [...usuario].reduce((suma, letra) => suma + letra.charCodeAt(0), 0) % 360;
  return `hsl(${tono} 70% 65%)`;
}

function colorDeUsuario(rol, usuario) {
  return rol === 'viewer' && cfg.colorAleatorio ? colorAleatorioDe(usuario) : roles[rol].colorUsuario;
}

function renderText(text, emotes) {
  const safeText = String(text ?? '');
  if (!emotes || Object.keys(emotes).length === 0) return escaparHtml(safeText);
  const parts = safeText.split(/(:[a-zA-Z0-9_\-]+:)/g);
  return parts
    .map((part) => {
      const m = part.match(/^:([\w-]+):$/);
      if (m && emotes[m[1]]?.url) {
        return `<img src="${escaparAtributo(emotes[m[1]].url)}" alt="${escaparAtributo(m[1])}" class="chat-emote">`;
      }
      if (emotes[part]?.url) {
        return `<img src="${escaparAtributo(emotes[part].url)}" alt="${escaparAtributo(part)}" class="chat-emote">`;
      }
      return escaparHtml(part);
    })
    .join('');
}

function crearAvatar(url) {
  const imagen = document.createElement('img');
  imagen.className = 'msg-avatar';
  imagen.alt = '';
  imagen.src = url;
  // URL firmada caducada: sin foto vigente se quita en vez de dejar un hueco roto.
  imagen.addEventListener('error', () => imagen.remove(), { once: true });
  return imagen;
}

function crearPuntoPlataforma(plataforma) {
  const punto = document.createElement('span');
  punto.className = `platform-dot dot-${plataforma}`;
  punto.textContent = PLATFORM_LABEL[plataforma] || '';
  return punto;
}

function crearUsuario(mensaje, rol) {
  const usuario = document.createElement('span');
  usuario.className = 'msg-user';
  usuario.textContent = mensaje.user;
  const { efecto, ola, resplandor } = roles[rol];
  estilizarTexto(usuario, { efecto, ola, resplandor });
  return usuario;
}

function crearCuerpo(mensaje, rol) {
  const cuerpo = document.createElement('div');
  cuerpo.className = 'msg-body';

  if (cfg.usernames) {
    const separador = document.createElement('span');
    separador.className = 'msg-sep';
    separador.textContent = ':';
    cuerpo.append(crearUsuario(mensaje, rol), separador);
  }

  const texto = document.createElement('span');
  texto.className = 'msg-text';
  texto.innerHTML = renderText(mensaje.comment, mensaje.emotes);
  cuerpo.appendChild(texto);
  return cuerpo;
}

function crearMensaje(mensaje, rol) {
  const elemento = document.createElement('div');
  elemento.className = `msg anim-${cfg.animacionEntrada}`;
  elemento.style.setProperty('--rol-fondo', roles[rol].colorFondo);
  elemento.style.setProperty('--c-user', colorDeUsuario(rol, mensaje.user));
  elemento.style.setProperty('--c-texto', roles[rol].colorComentario);

  if (cfg.mostrarAvatares && mensaje.avatar) elemento.appendChild(crearAvatar(mensaje.avatar));
  elemento.append(crearPuntoPlataforma(mensaje.platform), crearCuerpo(mensaje, rol));
  return elemento;
}

function ocultarTras(elemento, segundos) {
  setTimeout(() => {
    elemento.classList.add('saliendo');
    setTimeout(() => elemento.remove(), SALIDA_MS);
  }, segundos * 1000);
}

function addMessage(mensaje) {
  if (!cfg.platforms[mensaje.platform]) return;
  const rol = rolDe(mensaje);
  if (!roles[rol].mostrar) return;

  const elemento = crearMensaje(mensaje, rol);
  container.appendChild(elemento);
  if (cfg.ocultarTras > 0) ocultarTras(elemento, cfg.ocultarTras);
  while (container.children.length > cfg.maxmsgs) container.removeChild(container.firstChild);
}

function alManejarMensaje(d) {
  if (d.type === 'chat') addMessage(d);
  else if (d.type === 'config-updated') aplicarA11y(d.config || {});
}

// overlay-chat escala la fuente con a11yUiFontScale, salvo que la URL fije `size`
// a mano — por eso no usa el modulo compartido de accesibilidad.
function aplicarA11y(config) {
  document.body.classList.toggle('reduce-motion', !!config.a11yReduceMotion);
  if (!params.has('size') && config.a11yUiFontScale) {
    document.documentElement.style.setProperty('--fs', `${cfg.tamano * config.a11yUiFontScale}px`);
  }
}

fetch('/api/config').then((r) => r.json()).then(aplicarA11y).catch(() => {});
conectarWSOverlay(alManejarMensaje);
