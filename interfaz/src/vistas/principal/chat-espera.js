/**
 * Mientras alguna plataforma esta conectandose (logo amarillo) y el chat
 * sigue vacio (#emptyState), muestra barras en onda y una frase que va
 * rotando. plataformas.js#pintarCuentasVinculadas pone .conectando en
 * .chat-section; al terminar de conectar vuelve el estado vacio normal.
 */
import { t } from '../../nucleo/i18n/i18n.js';
import { addSystemMsg } from './chat-ui.js';

const INTERVALO_MS = 3200;
let ultima = -1;

const BARRAS = 7;

// Barras de la onda (como loading-ui/wave) + la frase quieta debajo.
function crearEspera() {
  const espera = document.createElement('div');
  espera.className = 'chat-espera';
  const ola = document.createElement('div');
  ola.className = 'chat-espera-ola';
  ola.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < BARRAS; i++) {
    const barra = document.createElement('span');
    barra.style.setProperty('--i', i);
    ola.append(barra);
  }
  const texto = document.createElement('p');
  texto.className = 'chat-espera-texto';
  espera.append(ola, texto);
  return espera;
}

// Reinicia la animacion de entrada en cada frase (fundido corto, sin movimiento por letra).
function mostrarFrase(texto, frase) {
  texto.textContent = frase;
  texto.classList.remove('entra');
  void texto.offsetWidth;
  texto.classList.add('entra');
}

/** Pinta una frase nueva si corresponde. Llamarla tambien al cambiar .conectando. */
export function actualizarChatEspera() {
  const section = document.querySelector('.chat-section');
  const empty = document.getElementById('emptyState');
  if (!empty || !section?.classList.contains('conectando')) return;
  let espera = empty.querySelector('.chat-espera');
  if (!espera) {
    espera = crearEspera();
    empty.append(espera);
  }
  // Lista cerrada de frases en un solo string (separadas por "|") para que
  // los 10 locales mantengan la paridad de claves.
  const frases = t('chat.waitingPhrases').split('|');
  let i;
  do { i = Math.floor(Math.random() * frases.length); } while (frases.length > 1 && i === ultima);
  ultima = i;
  mostrarFrase(espera.querySelector('.chat-espera-texto'), frases[i]);
}

export function iniciarChatEspera() {
  setInterval(actualizarChatEspera, INTERVALO_MS);
}

/**
 * Tras conectar con el chat todavia vacio: un solo aviso de sistema con una
 * frase de animo al azar (reemplaza al #emptyState, addSystemMsg lo quita).
 * No se lee por TTS ni suma al contador de mensajes.
 */
export function anunciarStreamListo() {
  if (!document.getElementById('emptyState')) return;
  const frases = t('chat.cheerPhrases').split('|');
  const frase = frases[Math.floor(Math.random() * frases.length)];
  addSystemMsg(frase, 'admin', `cheer-${Date.now()}`, { iconSrc: 'icons/emoji_events.svg' });
}
