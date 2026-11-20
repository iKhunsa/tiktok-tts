import { aplicarTraducciones } from '../../nucleo/i18n/i18n.js';
import { crearNieve } from './nieve.js';
import { htmlHero } from './hero.js';
import { abrirVentanaTemporada } from './abrir-ventana.js';
import { marcarTemporadaAnunciada } from './estado.js';
import { sugerirBotonTemporada } from './boton.js';

const SALIDA_MS = 220;

/**
 * Pantalla de bienvenida de una temporada, a ventana completa y con un unico boton grande ("Descubre mas") y, debajo, un
 * "Ahora no" discreto. Se muestra una sola vez por cuenta: cualquiera de las dos salidas (o Esc) la marca como vista.
 * Entrar abre la ventana de la temporada; "Ahora no" hace latir el boton de la barra de titulo para que sepan donde esta.
 */
export function mostrarAnuncio(temporada) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show temporada-anuncio';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'temporadaAnuncioTitulo');
  overlay.innerHTML = `
    <img class="temporada-escena" src="${temporada.escena}" alt="">
    <div class="temporada-contenido">${htmlHero(temporada.id, 'temporadaAnuncioTitulo')}
      <button type="button" class="temporada-cta" data-descubrir data-i18n="temporada.${temporada.id}.descubre"></button>
      <button type="button" class="temporada-ahora-no" data-ahora-no data-i18n="temporada.ahoraNo"></button>
    </div>`;
  crearNieve(overlay);
  document.body.append(overlay);
  aplicarTraducciones(overlay);

  const cerrar = (despues) => {
    marcarTemporadaAnunciada(temporada.id);
    document.removeEventListener('keydown', alTeclear, true);
    overlay.classList.add('is-saliendo');
    setTimeout(() => { overlay.remove(); despues?.(); }, SALIDA_MS);
  };
  function alTeclear(evento) {
    if (evento.key !== 'Escape') return;
    evento.preventDefault();
    evento.stopPropagation();
    cerrar(sugerirBotonTemporada);
  }
  document.addEventListener('keydown', alTeclear, true);
  overlay.querySelector('[data-descubrir]').addEventListener('click', () => cerrar(() => abrirVentanaTemporada(temporada)));
  overlay.querySelector('[data-ahora-no]').addEventListener('click', () => cerrar(sugerirBotonTemporada));
  overlay.tabIndex = -1; // el foco entra al dialogo sin marcar el boton: Tab llega primero a "Descubre mas"
  overlay.focus({ preventScroll: true });
}
