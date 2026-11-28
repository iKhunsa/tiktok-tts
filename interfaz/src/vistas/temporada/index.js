import '../../estilos/overlays-catalogo.css'; // por las miniaturas de los overlays en Shop
import '../../estilos/temporada.css';
import '../../estilos/temporada-paneles.css';
import '../../estilos/ruleta.css';
import '../../estilos/bola-misteriosa.css';
import '../../estilos/temporada-aviso.css';
import { cargarIdioma, idiomaGuardado, aplicarTraducciones, t } from '../../nucleo/i18n/i18n.js';
import { TEMPORADAS } from '../../componentes/temporada/catalogo.js';
import { crearNieve } from '../../componentes/temporada/nieve.js';
import { crearPanelInicio } from './paneles/inicio.js';
import { crearPanelLuckyDrop } from './paneles/lucky-drop.js';
import { crearPanelPase } from './paneles/pase.js';
import { crearPanelTienda } from './paneles/tienda.js';
import { crearSaldo } from './saldo.js';
import { identificarCuenta } from './identificar-cuenta.js';
import { abrirBancoMonedas, bancoAbierto, cerrarBancoMonedas } from './banco-monedas.js';

// Ventana de una temporada (se abre desde el boton de la barra de titulo): pestanas arriba, una seccion a la vez, flechas
// laterales para pasar de una a otra y, en las pestanas con economia, el saldo de monedas arriba a la derecha.
const id = new URLSearchParams(location.search).get('e');
const temporada = TEMPORADAS.find((candidata) => candidata.id === id) ?? TEMPORADAS[0];
const pestanas = temporada.pestanas;
let activa = 0;
let saldo = null;

const $ = (selector) => document.querySelector(selector);

// Cada pestana del manifiesto se dibuja con su panel; una pestana nueva = un archivo en paneles/ y una linea aqui.
const PANELES = {
  inicio: () => crearPanelInicio(temporada, { irASiguiente: () => seleccionar(1) }),
  luckyDrop: crearPanelLuckyDrop,
  pase: crearPanelPase,
  tienda: crearPanelTienda,
};

function montar() {
  document.title = `TikLiveTTS — ${t(`temporada.${temporada.id}.nombre`)}`;
  const nav = $('#temporadaPestanas');
  const paneles = $('#temporadaPaneles');
  pestanas.forEach((pestana, indice) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'temporada-pestana';
    boton.id = `temporadaPestana-${pestana.id}`;
    boton.setAttribute('role', 'tab');
    boton.setAttribute('aria-controls', `temporadaPanel-${pestana.id}`);
    boton.dataset.i18n = `temporada.pestana.${pestana.id}`;
    boton.addEventListener('click', () => seleccionar(indice - activa));
    nav.append(boton);
    const panel = PANELES[pestana.id]();
    panel.id = `temporadaPanel-${pestana.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', boton.id);
    paneles.append(panel);
  });
  saldo = crearSaldo();
  saldo.addEventListener('click', abrirBancoMonedas); // todo el recuadro; el "+" es su control de teclado
  $('.temporada-barra').after(saldo);
  crearNieve($('.temporada-fondo'));
  aplicarTraducciones(document);
  pintar();
}

/** Mueve la seccion activa `delta` posiciones (sin salirse de los extremos). */
function seleccionar(delta) {
  const destino = Math.min(pestanas.length - 1, Math.max(0, activa + delta));
  if (destino === activa) return;
  activa = destino;
  pintar();
}

function pintar() {
  pestanas.forEach((pestana, indice) => {
    const seleccionada = indice === activa;
    const boton = $(`#temporadaPestana-${pestana.id}`);
    boton.setAttribute('aria-selected', String(seleccionada));
    boton.tabIndex = seleccionada ? 0 : -1;
    $(`#temporadaPanel-${pestana.id}`).hidden = !seleccionada;
  });
  saldo.hidden = !pestanas[activa].saldo;
  $('#temporadaSiguiente').hidden = activa !== 0; // la flecha lateral solo invita a salir de la bienvenida; despues mandan las pestanas
}

function iniciarTeclado() {
  document.addEventListener('keydown', (evento) => {
    // Con un dialogo abierto las teclas son suyas, aunque el foco se haya quedado fuera (Esc cerraria la ventana).
    if (document.querySelector('dialog[open]')) return;
    if (evento.key === 'Escape') { if (bancoAbierto()) cerrarBancoMonedas(); else window.close(); }
    else if (evento.target.closest?.('.temporada-pasos, input')) return; // las flechas de la fila de recompensas son suyas
    else if (evento.key === 'ArrowRight') { seleccionar(1); $(`#temporadaPestana-${pestanas[activa].id}`).focus(); }
    else if (evento.key === 'ArrowLeft') { seleccionar(-1); $(`#temporadaPestana-${pestanas[activa].id}`).focus(); }
  });
  $('#temporadaSiguiente').addEventListener('click', () => seleccionar(1));
}

async function iniciar() {
  await Promise.all([cargarIdioma(idiomaGuardado() || 'es'), identificarCuenta()]); // la cuenta, antes de leer lo suyo
  montar();
  iniciarTeclado();
}

iniciar();
