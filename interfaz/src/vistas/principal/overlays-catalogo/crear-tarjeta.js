import { copyCfgUrl, repetirVistaPrevia, restablecerOverlay } from '../configurador-overlays.js';

function crearBoton(contenido, alPulsar) {
  const boton = document.createElement('button');
  boton.className = 'cfg-btn';
  boton.type = 'button';
  boton.innerHTML = contenido;
  boton.addEventListener('click', () => alPulsar(boton));
  return boton;
}

/** Tarjeta de un overlay nuevo, con la misma estructura que las estaticas de index.html. */
export function crearTarjetaOverlay({ id, icono, medida, personalizable }) {
  const tarjeta = document.createElement('div');
  tarjeta.className = 'cfg-card';
  tarjeta.innerHTML = `
    <div class="cfg-header">
      <div class="cfg-icon"><img class="icon-inline" src="icons/${icono}.svg" alt=""></div>
      <div class="cfg-meta">
        <div class="cfg-title" data-i18n="overlayCat.ov.${id}.titulo"></div>
        <div class="cfg-subtitle" data-i18n="overlayCat.ov.${id}.desc"></div>
      </div>
      <span class="obs-hint">${medida}</span>
    </div>
    <div class="cfg-fields" data-campos-base="${id}"></div>
    ${personalizable ? `<details class="cfg-personalizar" data-campos-panel="${id}"><summary data-i18n="overlayCfg.personalizar"></summary></details>` : ''}
    <iframe class="cfg-preview" data-preview="${id}" tabindex="-1" aria-hidden="true"></iframe>
    <div class="cfg-url-row">
      <span class="cfg-url-text" id="cfg-url-${id}"></span>
      <a class="cfg-btn" id="cfg-open-${id}" target="_blank" data-i18n="btn.open"></a>
    </div>`;
  tarjeta.querySelector('.cfg-url-row a').before(
    crearBoton('<img class="icon-inline" src="icons/replay.svg" alt=""> <span data-i18n="overlayCat.repetir"></span>', () => repetirVistaPrevia(id)),
    crearBoton('<img class="icon-inline" src="icons/restore.svg" alt=""> <span data-i18n="btn.reset"></span>', (boton) => restablecerOverlay(id, boton)),
    crearBoton('<span data-i18n="btn.copy"></span>', () => copyCfgUrl(id)),
  );
  return tarjeta;
}
