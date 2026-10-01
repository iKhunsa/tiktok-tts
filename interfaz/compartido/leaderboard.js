import { idiomaOverlay } from './i18n-overlay.js';
import { estilizarTexto } from './estilo/estilizar-texto.js';
import { animarNumero } from './animar-numero.js';
import { AVATAR_PLACEHOLDER, CORONA_SVG } from './leaderboard-iconos.js';

const PODIO = 3;
const SPRING = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';

const movimientoReducido = () => document.body.classList.contains('reduce-motion');

/**
 * Ranking compartido por Top Likers y Top Donadores.
 * `cfg` es la config del overlay (esquema campos-ranking.js); `vista` lo que
 * cambia entre rankings: { campoValor, simboloHtml, textoVacio }.
 * Devuelve `pintar` (estado inicial, sin animacion) y `pintarAnimado`
 * (reordena deslizando filas, destella y cuenta los valores que cambiaron).
 */
export function crearLeaderboard(cfg, { campoValor, simboloHtml, textoVacio }) {
  const tablero = document.getElementById('leaderboard');
  let valoresPrevios = new Map();

  aplicarConfigVisual(tablero, cfg);

  const formatear = (numero) => numero.toLocaleString(idiomaOverlay());

  function dibujar(entradas) {
    const visibles = entradas.slice(0, cfg.rows);
    if (visibles.length === 0) {
      tablero.innerHTML = `<div class="empty-msg">${textoVacio}</div>`;
    } else {
      tablero.replaceChildren(...visibles.map((entrada, indice) => crearFila(entrada, indice + 1)));
    }
    return visibles;
  }

  function crearFila(entrada, rango) {
    const fila = document.createElement('div');
    fila.className = `row row-${rango}`;
    fila.dataset.user = entrada.user;

    if (cfg.mostrarRango) fila.appendChild(crearRango(rango));
    if (cfg.mostrarAvatares) fila.appendChild(crearAvatar(entrada, rango));
    fila.appendChild(crearIdentidad(entrada));
    return fila;
  }

  function crearRango(rango) {
    const celda = document.createElement('span');
    celda.className = 'rank';
    if (rango <= PODIO && cfg.mostrarMedallas) {
      celda.innerHTML = `<span class="medalla medalla-${rango}">${rango}</span>`;
    } else {
      celda.textContent = rango;
    }
    return celda;
  }

  function crearAvatar(entrada, rango) {
    const contenedor = document.createElement('span');
    contenedor.className = 'avatar';

    const imagen = document.createElement('img');
    imagen.className = 'avatar-img';
    imagen.alt = '';
    imagen.src = entrada.avatar || AVATAR_PLACEHOLDER;
    // Las URLs firmadas de TikTok caducan: sin foto vigente se muestra la silueta.
    imagen.addEventListener('error', () => { imagen.src = AVATAR_PLACEHOLDER; }, { once: true });
    contenedor.appendChild(imagen);

    if (rango === 1 && cfg.mostrarCorona) contenedor.insertAdjacentHTML('beforeend', CORONA_SVG);
    return contenedor;
  }

  function crearIdentidad(entrada) {
    const identidad = document.createElement('span');
    identidad.className = 'identidad';

    const nombre = document.createElement('span');
    nombre.className = 'username';
    nombre.textContent = entrada.user;
    estilizarTexto(nombre, { efecto: cfg.efectoUsuario, ola: cfg.olaUsuario });
    identidad.appendChild(nombre);

    if (cfg.mostrarValor) identidad.appendChild(crearValor(entrada));
    return identidad;
  }

  function crearValor(entrada) {
    const valor = document.createElement('span');
    valor.className = 'valor';
    if (cfg.mostrarSimbolo) valor.insertAdjacentHTML('beforeend', simboloHtml);

    const numero = document.createElement('span');
    numero.className = 'valor-numero';
    numero.textContent = formatear(entrada[campoValor]);
    valor.appendChild(numero);
    return valor;
  }

  function guardarValores(entradas) {
    valoresPrevios = new Map(entradas.map((entrada) => [entrada.user, entrada[campoValor]]));
  }

  function resaltarCambios(visibles, previos) {
    for (const entrada of visibles) {
      const anterior = previos.get(entrada.user);
      if (anterior === undefined || anterior === entrada[campoValor]) continue;
      const fila = [...tablero.children].find((candidata) => candidata.dataset.user === entrada.user);
      if (!fila) continue;
      fila.classList.add('row-pulso');
      const numero = fila.querySelector('.valor-numero');
      if (numero) animarNumero(numero, anterior, entrada[campoValor], formatear);
    }
  }

  function pintar(entradas) {
    dibujar(entradas);
    guardarValores(entradas);
  }

  function pintarAnimado(entradas) {
    const posicionesPrevias = leerPosiciones(tablero);
    const previos = valoresPrevios;
    const visibles = dibujar(entradas);
    guardarValores(entradas);
    if (movimientoReducido()) return;
    deslizarDesde(tablero, posicionesPrevias);
    resaltarCambios(visibles, previos);
  }

  return { pintar, pintarAnimado };
}

function aplicarConfigVisual(tablero, cfg) {
  const raiz = document.documentElement.style;
  raiz.setProperty('--accent', cfg.color);
  raiz.setProperty('--bg-alpha', String(cfg.bg));
  raiz.setProperty('--c-user', cfg.colorUsuario);
  raiz.setProperty('--c-valor', cfg.colorValor);
  raiz.setProperty('--c-rango', cfg.colorRango);
  raiz.setProperty('--c-placa', cfg.colorPlaca);
  tablero.classList.toggle('rtl', cfg.derechaAIzquierda);
  tablero.classList.toggle('con-placa', cfg.placa);
}

function leerPosiciones(tablero) {
  const posiciones = new Map();
  tablero.querySelectorAll('.row[data-user]').forEach((fila) => {
    posiciones.set(fila.dataset.user, fila.getBoundingClientRect().top);
  });
  return posiciones;
}

// FLIP: cada fila que ya existia arranca en su posicion anterior y se desliza a la nueva.
function deslizarDesde(tablero, posicionesPrevias) {
  tablero.querySelectorAll('.row[data-user]').forEach((fila) => {
    const anterior = posicionesPrevias.get(fila.dataset.user);
    if (anterior === undefined) return;
    const delta = anterior - fila.getBoundingClientRect().top;
    if (Math.abs(delta) <= 2) return;
    fila.style.transition = 'none';
    fila.style.transform = `translateY(${delta}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fila.style.transition = SPRING;
      fila.style.transform = '';
    }));
  });
}
