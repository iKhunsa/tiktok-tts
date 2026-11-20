import { abrirVentanaTemporada } from './abrir-ventana.js';

const boton = () => document.getElementById('titlebarSeason');

/** Muestra el boton de la barra de titulo (junto a Novedades) mientras hay una temporada vigente. */
export function iniciarBotonTemporada(temporada) {
  boton().hidden = false;
  boton().addEventListener('click', () => abrirVentanaTemporada(temporada));
}

/** Punto rojo del boton: hay algo por reclamar (una mision completa). Lo enciende quien gestiona las misiones. */
export function marcarTemporadaPendiente(hayPendiente) {
  const punto = boton()?.querySelector('.titlebar-season-punto');
  if (punto) punto.hidden = !hayPendiente;
}

/** Un par de latidos del boton: le dice a quien eligio "Ahora no" donde encontrar la temporada despues. */
export function sugerirBotonTemporada() {
  const el = boton();
  if (!el) return;
  el.classList.add('is-sugerido');
  el.addEventListener('animationend', () => el.classList.remove('is-sugerido'), { once: true });
}
