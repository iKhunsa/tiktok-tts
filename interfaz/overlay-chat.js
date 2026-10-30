import { leerParametros } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml, escaparAtributo } from './compartido/escapar-html.js';
import { leerConfig } from './compartido/estilo/query.js';
import { ESQUEMAS } from './compartido/estilo/esquemas.js';
import { aplicarTipografia } from './compartido/estilo/aplicar-tipografia.js';
import { aplicarAlineacion } from './compartido/estilo/aplicar-alineacion.js';
import { estilizarTexto } from './compartido/estilo/estilizar-texto.js';
import { crearIconoPlataforma, crearInsigniaPlataforma } from './compartido/iconos-plataforma.js';
import { avatarGenerado } from './compartido/avatar-generado.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { MUESTRA_CHAT } from './compartido/muestras-vista-previa.js';

registrarErroresOverlay();

const ROLES = ['viewer', 'moderador', 'suscriptor'];
const ANCHO_BASE = 420;
const MENSAJES_POR_RAFAGA = 3;
const PAUSA_ENTRE_MENSAJES_MS = 600;
const PAUSA_ANTES_DE_SALIR_MS = 1200;
const PAUSA_ENTRE_SALIDAS_MS = 150;
const PAUSA_ENTRE_RAFAGAS_MS = 500;

const params = leerParametros();
const vistaPrevia = esVistaPrevia(params);
const cfg = leerConfig(ESQUEMAS.chat, params);
const roles = Object.fromEntries(ROLES.map((rol) => [rol, leerRol(rol)]));
const container = document.getElementById('chat-container');
const plataformasVisibles = Object.keys(cfg.platforms).filter((plataforma) => cfg.platforms[plataforma]);
const plataformaUnica = plataformasVisibles.length === 1 ? plataformasVisibles[0] : null;
// Chat de una sola plataforma: toda la muestra sale de esa, asi no queda casi vacia.
const muestraChat = plataformaUnica ? MUESTRA_CHAT.map((mensaje) => ({ ...mensaje, platform: plataformaUnica })) : MUESTRA_CHAT;

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
  aplicarTipografia(cfg, ANCHO_BASE);
  aplicarAlineacion(cfg);
  document.body.dataset.skin = cfg.skin;
  document.documentElement.style.setProperty('--msg-w', String(cfg.anchoMensajes));
  document.documentElement.style.setProperty('--bg-alpha', String(cfg.bg));
  document.documentElement.style.setProperty('--entrada-ms', `${cfg.duracionEntrada}ms`);
  document.documentElement.style.setProperty('--salida-ms', `${cfg.duracionSalida}ms`);
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

// Avatar con anillo del color de la plataforma y su logo en una burbuja en la
// esquina. Twitch y Kick no traen foto: se muestra un avatar generado para que
// el anillo y la burbuja tengan donde anclarse.
function crearAvatar(mensaje) {
  const imagen = document.createElement('img');
  imagen.className = 'msg-avatar';
  imagen.alt = '';
  const generado = avatarGenerado(mensaje.user);
  imagen.src = mensaje.avatar || generado;
  // URL firmada caducada: sin foto vigente se muestra el avatar generado.
  imagen.addEventListener('error', () => { imagen.src = generado; }, { once: true });

  const contenedor = document.createElement('span');
  contenedor.className = `avatar-plataforma plat-${mensaje.platform}`;
  contenedor.append(imagen, crearInsigniaPlataforma(mensaje.platform));
  return contenedor;
}

function crearUsuario(mensaje, rol) {
  const usuario = document.createElement('span');
  usuario.className = 'msg-user';
  usuario.textContent = mensaje.user;
  const { efecto, ola, resplandor } = roles[rol];
  estilizarTexto(usuario, { efecto, ola, resplandor });
  if (mensaje.badge?.url) {
    const insignia = document.createElement('img');
    insignia.className = 'msg-insignia';
    insignia.src = mensaje.badge.url;
    insignia.alt = mensaje.badge.label;
    insignia.title = mensaje.badge.label;
    insignia.addEventListener('error', () => insignia.remove(), { once: true });
    usuario.prepend(insignia);
  }
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

  const marcaPlataforma = cfg.mostrarAvatares ? crearAvatar(mensaje) : crearIconoPlataforma(mensaje.platform);
  elemento.append(marcaPlataforma, crearCuerpo(mensaje, rol));
  return elemento;
}

function ocultar(elemento) {
  if (cfg.animacionSalida === 'ninguna') return elemento.remove();
  elemento.classList.add('saliendo', cfg.animacionSalida);
  setTimeout(() => elemento.remove(), cfg.duracionSalida);
}

function addMessage(mensaje) {
  const plataformaVisible = cfg.platforms[mensaje.platform];
  if (!plataformaVisible && (!vistaPrevia || plataformaUnica)) return;
  const rol = rolDe(mensaje);
  if (!roles[rol].mostrar) return;

  const elemento = crearMensaje(mensaje, rol);
  // Vista previa con varias plataformas: la que el filtro excluye sale atenuada.
  if (!plataformaVisible) elemento.classList.add('msg-excluido');
  container.appendChild(elemento);
  if (cfg.ocultarTras > 0 && !vistaPrevia) setTimeout(() => ocultar(elemento), cfg.ocultarTras * 1000);
  while (container.children.length > cfg.maxmsgs) container.removeChild(container.firstChild);
  quitarCortados();
  return elemento;
}

// Los viejos desbordan por arriba: el que ya no entra entero se quita, asi solo se ven recuadros completos.
function quitarCortados() {
  const tope = container.getBoundingClientRect().top;
  while (container.children.length > 1 && container.firstElementChild.getBoundingClientRect().top < tope) {
    container.firstElementChild.remove();
  }
}
window.addEventListener('resize', quitarCortados);

function alManejarMensaje(d) {
  if (d.type === 'chat') addMessage(d);
  else if (d.type === 'config-updated') aplicarA11y(d.config || {});
}

// overlay-chat escala la fuente con a11yUiFontScale, salvo que la URL fije `size`
// a mano — por eso no usa el modulo compartido de accesibilidad.
function aplicarA11y(config) {
  document.body.classList.toggle('reduce-motion', !!config.a11yReduceMotion);
  if (!params.has('size') && config.a11yUiFontScale) {
    aplicarTipografia({ ...cfg, tamano: cfg.tamano * config.a11yUiFontScale }, ANCHO_BASE);
  }
}

// La muestra aparece quieta y luego, en bucle, entra una rafaga de mensajes y
// sale, para ver las animaciones elegidas aunque "ocultar tras" este apagado.
function iniciarVistaPrevia() {
  muestraChat.forEach(addMessage);
  for (const elemento of container.children) elemento.style.animation = 'none';

  let enviados = 0;
  const rafaga = [];
  const entrarSiguiente = () => {
    const elemento = addMessage(muestraChat[enviados % muestraChat.length]);
    if (elemento) rafaga.push(elemento);
    enviados += 1;
    if (enviados % MENSAJES_POR_RAFAGA === 0) setTimeout(salirRafaga, cfg.duracionEntrada + PAUSA_ANTES_DE_SALIR_MS);
    else setTimeout(entrarSiguiente, PAUSA_ENTRE_MENSAJES_MS);
  };
  const salirRafaga = () => {
    rafaga.splice(0).forEach((elemento, i) => setTimeout(() => ocultar(elemento), i * PAUSA_ENTRE_SALIDAS_MS));
    const ultimaSalida = (MENSAJES_POR_RAFAGA - 1) * PAUSA_ENTRE_SALIDAS_MS + cfg.duracionSalida;
    setTimeout(entrarSiguiente, ultimaSalida + PAUSA_ENTRE_RAFAGAS_MS);
  };
  setTimeout(entrarSiguiente, PAUSA_ENTRE_MENSAJES_MS);
}

fetch('/api/config').then((r) => r.json()).then(aplicarA11y).catch(() => {});
if (vistaPrevia) iniciarVistaPrevia();
conectarWSOverlay(alManejarMensaje);
