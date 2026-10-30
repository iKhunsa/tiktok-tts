import { alAbrirTarjetaOverlay } from './configurador-overlays.js';

const tarjetas = () => document.querySelectorAll('#view-overlays .cfg-card');

function fijarAbierta(tarjeta, abierta) {
  tarjeta.classList.toggle('abierta', abierta);
  tarjeta.querySelector('.cfg-header').setAttribute('aria-expanded', String(abierta));
  if (abierta) alAbrirTarjetaOverlay(tarjeta);
}

function alternar(evento) {
  const cabecera = evento.target.closest('#view-overlays .cfg-header');
  if (!cabecera) return;
  if (evento.type === 'keydown' && evento.key !== 'Enter' && evento.key !== ' ') return;
  evento.preventDefault();
  const tarjeta = cabecera.closest('.cfg-card');
  fijarAbierta(tarjeta, !tarjeta.classList.contains('abierta'));
}

/** El tutorial apunta a campos dentro de estas tarjetas: tienen que estar abiertas. */
export function abrirTarjetasOverlays(tipos) {
  tipos.forEach((tipo) => fijarAbierta(document.querySelector(`[data-preview="${tipo}"]`).closest('.cfg-card'), true));
}

/** Cada tarjeta de overlay se pliega desde su cabecera; arrancan todas contraidas. */
export function iniciarAcordeonOverlays() {
  tarjetas().forEach((tarjeta) => {
    const cabecera = tarjeta.querySelector('.cfg-header');
    cabecera.setAttribute('role', 'button');
    cabecera.tabIndex = 0;
    const flecha = document.createElement('img');
    flecha.className = 'icon-inline cfg-acordeon-flecha';
    flecha.src = 'icons/expand_more.svg';
    flecha.alt = '';
    cabecera.append(flecha);
    fijarAbierta(tarjeta, false);
  });
  const vista = document.getElementById('view-overlays');
  vista.addEventListener('click', alternar);
  vista.addEventListener('keydown', alternar);
}
