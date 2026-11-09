import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { crearCampo } from './crear-campo.js';
import { tituloGrupo, tituloSubgrupo } from './etiquetas.js';

// Lo propio de cada overlay primero (lo que mas se toca), despues el aspecto del texto y al final posicion y movimiento.
const ORDEN_GRUPOS = ['cancion', 'ranking', 'comportamiento', 'tipografia', 'usuario', 'viewer', 'moderador', 'suscriptor', 'alineacion', 'animacion'];
const posicionGrupo = (grupo) => (ORDEN_GRUPOS.includes(grupo) ? ORDEN_GRUPOS.indexOf(grupo) : ORDEN_GRUPOS.length);

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

export function crearBotonRestablecer(overlay, grupo) {
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

  // [data-campos-fijo]: datos que no son ajustes (ej. seguidores actuales); se conservan al redibujar.
  base.replaceChildren(...grupos.get('base').filter(({ ui }) => ui !== 'oculto').map((campo) => crearCampo(overlay, campo)), ...base.querySelectorAll(':scope > [data-campos-fijo]'));
  grupos.delete('base');

  if (!panel) return;
  panel.querySelectorAll('.cfg-grupo').forEach((grupo) => grupo.remove());
  const ordenados = [...grupos].sort(([a], [b]) => posicionGrupo(a) - posicionGrupo(b));
  for (const [grupo, campos] of ordenados) {
    if (campos.some(({ ui }) => ui !== 'oculto')) panel.appendChild(crearGrupo(overlay, grupo, campos));
  }
}
