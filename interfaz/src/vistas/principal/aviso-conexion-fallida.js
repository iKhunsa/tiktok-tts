/**
 * Aviso que sale cuando "Conectar todo" no logra conectar ningun canal: la app
 * esta en desarrollo y puede fallar, asi que invita al Discord para ayudar.
 * Una sola vez por carga de ventana (si el usuario reintenta y vuelve a
 * fallar, no se repite el modal ni el sonido).
 */
import { reproducirSonidoUi } from '../../componentes/sonido-ui.js';
import { trackUi } from '../../nucleo/telemetria-ui.js';

const ID_MODAL = 'connectFailModal';
const ORIGEN_ANALITICA = 'connect_fail';
// Original a -2 LUFS (y con picos sobre 0 dBFS): normalizado a -20 LUFS y a 0.4
// queda ~-28 LUFS, un cue discreto bajo el TTS.
const SONIDO_RISA = { src: 'audio/ui/cat-laugh.mp3', volumen: 0.4 };

let yaMostrado = false;

const modal = () => document.getElementById(ID_MODAL);
const track = (evento) => trackUi(evento, ORIGEN_ANALITICA);

export function mostrarAvisoConexionFallida() {
  if (yaMostrado) return;
  yaMostrado = true;
  track('ui:discord-opened');
  modal().classList.add('show');
  reproducirSonidoUi(SONIDO_RISA);
}

function cerrarAviso() {
  modal().classList.remove('show');
}

export function iniciarAvisoConexionFallida() {
  const overlay = modal();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarAviso(); });
  overlay.querySelector('.modal-close').addEventListener('click', cerrarAviso);
  overlay.querySelector('.discord-cta').addEventListener('click', () => track('ui:discord-joined'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarAviso(); });
}
