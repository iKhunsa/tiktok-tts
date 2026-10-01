import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { crearCampo } from './crear-campo.js';
import { tituloGrupo } from './etiquetas.js';

function agruparPorGrupo(esquema) {
  const grupos = new Map();
  for (const campo of esquema) {
    if (!grupos.has(campo.grupo)) grupos.set(campo.grupo, []);
    grupos.get(campo.grupo).push(campo);
  }
  return grupos;
}

function crearGrupo(overlay, grupo, campos) {
  const seccion = document.createElement('div');
  seccion.className = 'cfg-grupo';

  const titulo = document.createElement('h4');
  titulo.className = 'cfg-grupo-titulo';
  titulo.textContent = tituloGrupo(grupo);

  const rejilla = document.createElement('div');
  rejilla.className = 'cfg-fields';
  rejilla.append(...campos.map((campo) => crearCampo(overlay, campo)));

  seccion.append(titulo, rejilla);
  return seccion;
}

/**
 * Dibuja los campos de un overlay a partir de su esquema: el grupo `base`
 * va siempre visible; el resto, dentro del panel "Personalizar".
 * Se llama de nuevo al cambiar de idioma (las etiquetas se traducen al crear).
 */
export function montarCamposOverlay(overlay) {
  const grupos = agruparPorGrupo(ESQUEMAS[overlay]);
  const base = document.querySelector(`[data-campos-base="${overlay}"]`);
  const panel = document.querySelector(`[data-campos-panel="${overlay}"]`);

  base.replaceChildren(...grupos.get('base').map((campo) => crearCampo(overlay, campo)));
  grupos.delete('base');

  panel.querySelectorAll('.cfg-grupo').forEach((grupo) => grupo.remove());
  for (const [grupo, campos] of grupos) panel.appendChild(crearGrupo(overlay, grupo, campos));
}
