import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { crearCampo } from './crear-campo.js';
import { tituloGrupo, tituloSubgrupo } from './etiquetas.js';

function agruparPorGrupo(esquema) {
  const grupos = new Map();
  for (const campo of esquema) {
    if (!grupos.has(campo.grupo)) grupos.set(campo.grupo, []);
    grupos.get(campo.grupo).push(campo);
  }
  return grupos;
}

function crearSubtitulo(subtitulo) {
  const elemento = document.createElement('p');
  elemento.className = 'cfg-subtitulo';
  elemento.textContent = tituloSubgrupo(subtitulo);
  return elemento;
}

function crearBotonRestablecer(overlay, grupo) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'cfg-grupo-reset';
  boton.dataset.cfgOverlay = overlay;
  boton.dataset.cfgResetGrupo = grupo;
  boton.title = t('btn.resetSection');
  boton.setAttribute('aria-label', t('btn.resetSection'));
  boton.innerHTML = '<span></span><img class="icon-inline" src="icons/restore.svg" alt="">';
  return boton;
}

function crearGrupo(overlay, grupo, campos) {
  const seccion = document.createElement('details');
  seccion.className = 'cfg-grupo';

  const titulo = document.createElement('summary');
  titulo.className = 'cfg-grupo-titulo';
  titulo.textContent = tituloGrupo(grupo);
  titulo.appendChild(crearBotonRestablecer(overlay, grupo));

  const rejilla = document.createElement('div');
  rejilla.className = 'cfg-fields';
  for (const campo of campos.filter(({ ui }) => ui !== 'oculto')) {
    if (campo.subtitulo) rejilla.appendChild(crearSubtitulo(campo.subtitulo));
    rejilla.appendChild(crearCampo(overlay, campo));
  }

  seccion.append(titulo, rejilla);
  return seccion;
}

// Las tarjetas estaticas de index.html escriben a mano su grupo General: solo se les suma el zoom.
function montarEscalaEnEstatica(overlay, campos, panel) {
  const general = panel.closest('.cfg-card').querySelector('.cfg-fields');
  general.querySelector('[data-cfg-clave="escala"]')?.closest('.cfg-field').remove();
  general.prepend(crearCampo(overlay, campos.find(({ clave }) => clave === 'escala')));
}

/**
 * Dibuja los campos de un overlay a partir de su esquema: el grupo `base`
 * va siempre visible; el resto, en secciones plegables que empiezan cerradas (los
 * overlays sin grupos extra no tienen panel).
 * Se llama de nuevo al cambiar de idioma (las etiquetas se traducen al crear).
 */
export function montarCamposOverlay(overlay) {
  const grupos = agruparPorGrupo(ESQUEMAS[overlay]);
  const base = document.querySelector(`[data-campos-base="${overlay}"]`);
  const panel = document.querySelector(`[data-campos-panel="${overlay}"]`);

  if (base) base.replaceChildren(...grupos.get('base').map((campo) => crearCampo(overlay, campo)));
  else montarEscalaEnEstatica(overlay, grupos.get('base'), panel);
  grupos.delete('base');

  if (!panel) return;
  panel.querySelectorAll('.cfg-grupo').forEach((grupo) => grupo.remove());
  for (const [grupo, campos] of grupos) {
    if (campos.some(({ ui }) => ui !== 'oculto')) panel.appendChild(crearGrupo(overlay, grupo, campos));
  }
}
