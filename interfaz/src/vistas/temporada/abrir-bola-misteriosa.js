import { aplicarTraducciones } from '../../nucleo/i18n/i18n.js';
import { lanzarEstallido } from '../../componentes/ruleta/lanzar-estallido.js';
import { reproducirSonidoUi } from '../../componentes/sonido-ui.js';
import { sinMovimiento } from '../../componentes/ruleta/sin-movimiento.js';
import { PREMIOS_MISTERIOSOS } from './premios-misteriosos.js';

const ENTRADA_MS = 480;
const SUSPENSO_MS = 360;
const SALIDA_MS = 180;
const VUELTAS = 3;
const TEMBLOR_MS = 2300;
const CURVA = 'cubic-bezier(0.23, 1, 0.32, 1)';

const htmlMedalla = (icono) => `<span class="apertura-medalla" aria-hidden="true"><i style="--icono: url('/${icono}')"></i></span>`;
const htmlRareza = (rareza) => `<em class="apertura-rareza" data-i18n="temporada.mysteryBall.rareza.${rareza}"></em>`;

const htmlArte = ({ icono, media }) => (media ? `<img class="apertura-meme" src="${media}" alt="">` : htmlMedalla(icono));

function crearDialogo(ganador, arteBola) {
  const opciones = PREMIOS_MISTERIOSOS.map(({ id, rareza, icono }, i) => `
    <li class="apertura-opcion rareza-${rareza}" style="--i: ${i}">${htmlMedalla(icono)}
      <strong data-i18n="temporada.mysteryBall.${id}.nombre"></strong>${htmlRareza(rareza)}</li>`);
  const dialogo = document.createElement('dialog');
  dialogo.className = 'apertura';
  dialogo.classList.toggle('sin-premio', !!ganador.sinPremio);
  dialogo.classList.toggle('es-meme', !!ganador.media);
  dialogo.classList.toggle('is-quieto', sinMovimiento());
  dialogo.setAttribute('aria-labelledby', 'aperturaTitulo');
  dialogo.innerHTML = `
    <div class="apertura-marco">
      <h2 id="aperturaTitulo" data-i18n="temporada.mysteryBall.titulo"></h2>
      <div class="apertura-escena rareza-${ganador.rareza}">
        <div class="ruleta-rayos"></div>
        <div class="apertura-destello"></div>
        <img class="apertura-bola" src="${arteBola}" alt="">
        <div class="apertura-resultado" aria-live="polite" hidden>${htmlArte(ganador)}${htmlRareza(ganador.rareza)}
          <strong data-i18n="temporada.mysteryBall.${ganador.id}.nombre"></strong>
          <p data-i18n="temporada.mysteryBall.${ganador.id}.descripcion"></p>
        </div>
      </div>
      <ul class="apertura-opciones">${opciones.join('')}</ul>
      <button type="button" class="ruleta-girar apertura-continuar" data-continuar data-i18n="temporada.mysteryBall.continuar" hidden></button>
    </div>`;
  return dialogo;
}

/** La bola viaja desde el centro de la ruleta hasta el centro de la escena. */
function traerBola(bola, origen) {
  const desde = origen.getBoundingClientRect();
  const hasta = bola.getBoundingClientRect();
  const x = desde.x + desde.width / 2 - (hasta.x + hasta.width / 2);
  const y = desde.y + desde.height / 2 - (hasta.y + hasta.height / 2);
  const escala = Math.min(desde.width, desde.height) / hasta.width;
  bola.animate([{ transform: `translate(${x}px, ${y}px) scale(${escala})` }, { transform: 'none' }], { duration: ENTRADA_MS, easing: CURVA });
}

/** Temblor que crece mientras se decide el premio: la bola "se carga" antes de abrirse. */
function temblar(bola) {
  const unidad = bola.clientWidth / 300;
  const cuadros = Array.from({ length: 41 }, (_, i) => {
    const fuerza = (i / 40) ** 2;
    const lado = i % 2 ? 1 : -1;
    return { transform: `translateX(${lado * 9 * fuerza * unidad}px) rotate(${lado * 5 * fuerza}deg) scale(${1 + 0.14 * fuerza})` };
  });
  bola.animate(cuadros, { duration: TEMBLOR_MS, delay: ENTRADA_MS, fill: 'forwards' });
}

/** La marca salta de carta en carta, cada vez mas despacio, y se detiene en la ganadora. */
async function recorrerOpciones(cartas, destino, pausa) {
  const pasos = VUELTAS * cartas.length + destino;
  for (let paso = 0; paso <= pasos; paso++) {
    cartas.forEach((carta, i) => carta.classList.toggle('is-marcada', i === paso % cartas.length));
    await pausa(70 + 260 * (paso / pasos) ** 3);
  }
}

/** El meme "suena": se sacude mientras dura la risa y se calla si el dialogo se cierra antes. */
function reproducirMeme(dialogo, sonido) {
  const meme = dialogo.querySelector('.apertura-meme');
  const audio = reproducirSonidoUi(sonido);
  meme.classList.add('is-sonando');
  audio.addEventListener('ended', () => meme.classList.remove('is-sonando'));
  dialogo.addEventListener('close', () => audio.pause());
}

function revelar(dialogo, { sinPremio, sonido }) {
  if (!dialogo.open) return; // cerrado antes de tiempo: ni sonido ni confeti
  dialogo.classList.add('is-revelado');
  dialogo.querySelector('.apertura-resultado').hidden = false;
  const continuar = dialogo.querySelector('[data-continuar]');
  continuar.hidden = false;
  continuar.focus({ preventScroll: true });
  if (sonido) reproducirMeme(dialogo, sonido);
  if (!sinPremio && !sinMovimiento()) lanzarEstallido(dialogo.querySelector('.apertura-escena'));
}

/**
 * Apertura de la Mystery Ball a ventana completa: la bola se carga, la marca recorre los premios posibles y al abrirse
 * muestra el que ya venia decidido. Un clic (o Esc) salta al resultado. Resuelve cuando se cierra.
 * @param {string} ganadorId premio de PREMIOS_MISTERIOSOS
 * @param {HTMLImageElement} origen la bola que se ve en la ruleta
 */
export function abrirBolaMisteriosa(ganadorId, origen) {
  const destino = PREMIOS_MISTERIOSOS.findIndex((premio) => premio.id === ganadorId);
  if (destino < 0) throw new Error(`La Mystery Ball no tiene el premio "${ganadorId}"`);
  const ganador = PREMIOS_MISTERIOSOS[destino];
  const dialogo = crearDialogo(ganador, origen.src);
  document.body.append(dialogo);
  aplicarTraducciones(dialogo);
  dialogo.showModal(); // nativo: atrapa el foco y deja inerte lo de detras

  let saltar;
  const salto = new Promise((resolver) => { saltar = resolver; });
  const pausa = (ms) => Promise.race([salto, new Promise((resolver) => setTimeout(resolver, ms))]);
  const cerrar = () => {
    dialogo.classList.add('is-saliendo');
    setTimeout(() => dialogo.close(), SALIDA_MS);
  };

  dialogo.addEventListener('click', (evento) => (evento.target.closest('[data-continuar]') ? cerrar() : saltar()));
  dialogo.addEventListener('cancel', (evento) => {
    evento.preventDefault();
    if (dialogo.classList.contains('is-revelado')) cerrar(); else saltar();
  });

  async function animar() {
    const bola = dialogo.querySelector('.apertura-bola');
    if (sinMovimiento()) saltar();
    else { traerBola(bola, origen); temblar(bola); }
    await pausa(ENTRADA_MS);
    await recorrerOpciones([...dialogo.querySelectorAll('.apertura-opcion')], destino, pausa);
    await pausa(SUSPENSO_MS);
    revelar(dialogo, ganador);
  }
  animar();
  return new Promise((resolver) => dialogo.addEventListener('close', () => { dialogo.remove(); resolver(); }));
}
