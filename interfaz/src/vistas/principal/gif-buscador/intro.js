import { get, set } from '../../../nucleo/estado/datos-por-cuenta.js';

const CLAVE_OCULTAR = 'tikliveTTS_gifGuiaOculta';

const pasos = (iconoSenala) => [
  { icono: 'search', clave: 'paso1' },
  { icono: iconoSenala, clave: 'paso2' },
  { icono: 'check', clave: 'paso3' },
];

/** La guia solo aparece sola hasta que el usuario pide no volver a verla; siempre se puede reabrir a mano. */
export const guiaOculta = (claveOcultar = CLAVE_OCULTAR) => get(claveOcultar) === '1';

/**
 * Pantalla previa al navegador: explica con tres pasos y un ejemplo como se importa un GIF (o un sonido: `prefijo` es
 * la seccion de textos con la guia, `claveOcultar` donde se recuerda "no volver a mostrar" y `iconoSenala` el del paso 2).
 */
export function crearIntro({ alAbrir, prefijo = 'gifs', claveOcultar = CLAVE_OCULTAR, iconoSenala = 'gif' }) {
  const intro = document.createElement('div');
  intro.className = 'gif-intro';
  intro.innerHTML = `
    <div class="gif-intro-cuerpo">
      <h3 data-i18n="${prefijo}.introTitulo"></h3>
      <p class="gif-intro-desc" data-i18n="${prefijo}.introDesc"></p>
      <ol class="gif-pasos">
        ${pasos(iconoSenala).map(({ icono, clave }, i) => `
          <li class="gif-paso">
            <span class="gif-paso-icono"><img src="icons/${icono}.svg" alt=""></span>
            <span class="gif-paso-texto">
              <strong>${i + 1}. <span data-i18n="${prefijo}.${clave}Titulo"></span></strong>
              <span data-i18n="${prefijo}.${clave}Texto"></span>
            </span>
          </li>`).join('')}
      </ol>
      <p class="gif-intro-nota"><img src="icons/help_outline.svg" alt=""> <span data-i18n="${prefijo}.introNota"></span></p>
      <label class="gif-intro-no-volver"><input type="checkbox" id="gifGuiaNoVolver"> <span data-i18n="gifs.introNoVolver"></span></label>
      <button type="button" class="gif-boton-principal" id="gifIntroAbrir"><span data-i18n="gifs.introAbrir"></span> <img class="icon-inline" src="icons/arrow_forward.svg" alt=""></button>
    </div>`;
  intro.querySelector('#gifIntroAbrir').addEventListener('click', () => {
    if (intro.querySelector('#gifGuiaNoVolver').checked) set(claveOcultar, '1');
    alAbrir();
  });
  return intro;
}
