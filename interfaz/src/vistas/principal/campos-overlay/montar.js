import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { esCapaGif } from '../../../../compartido/estilo/campos-gif.js';
import { crearAcordeon, estadoAcordeones } from './acordeon.js';
import { CATEGORIAS, GRUPOS_DE_EFECTOS, SUBGRUPOS_AVANZADO, categoriaDe } from './categorias.js';
import { crearCampo } from './crear-campo.js';
import { tituloGrupo, tituloSubgrupo } from './etiquetas.js';
import { montarModo } from './montar-modo.js';

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

function crearEncabezado(texto) {
  const elemento = document.createElement('p');
  elemento.className = 'cfg-subtitulo';
  elemento.textContent = texto;
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
    if (campo.subtitulo) rejilla.appendChild(crearEncabezado(tituloSubgrupo(campo.subtitulo)));
    rejilla.appendChild(crearCampo(overlay, campo));
  }

  seccion.append(titulo, rejilla);
  return seccion;
}

// Los grupos propios de cada rol llevan un encabezado dentro de Efectos especiales, que los junta.
function crearCuerpoDeCampos(overlay, campos) {
  const cuerpo = document.createElement('div');
  cuerpo.className = 'cfg-fields';
  let anterior;
  for (const campo of campos) {
    if (GRUPOS_DE_EFECTOS.includes(campo.grupo) && campo.grupo !== anterior) cuerpo.appendChild(crearEncabezado(tituloGrupo(campo.grupo)));
    anterior = campo.grupo;
    cuerpo.appendChild(crearCampo(overlay, campo));
  }
  return cuerpo;
}

const cuerpoVacio = () => Object.assign(document.createElement('div'), { className: 'cfg-avanzado' });

function crearAcordeonInterno(overlay, subgrupo, campos, abiertos) {
  const clave = `avanzado-${subgrupo}`;
  return crearAcordeon({ overlay, clave, tituloI18n: `overlayCfg.avanzado.${subgrupo}`, abierto: abiertos.get(clave) ?? false, cuerpo: crearCuerpoDeCampos(overlay, campos) });
}

function crearAcordeonCategoria(overlay, categoria, porSubgrupo, abiertos) {
  const cuerpo = categoria === 'avanzado' ? cuerpoVacio() : crearCuerpoDeCampos(overlay, porSubgrupo.get(undefined));
  if (categoria === 'avanzado') {
    SUBGRUPOS_AVANZADO.filter((subgrupo) => porSubgrupo.has(subgrupo))
      .forEach((subgrupo) => cuerpo.appendChild(crearAcordeonInterno(overlay, subgrupo, porSubgrupo.get(subgrupo), abiertos)));
  }
  return crearAcordeon({
    overlay,
    clave: categoria,
    tituloI18n: `overlayCfg.categoria.${categoria}`,
    abierto: abiertos.get(categoria) ?? categoria === 'apariencia',
    cuerpo,
    reset: crearBotonRestablecer(overlay, categoria),
  });
}

// categoria -> (subgrupo | undefined) -> campos, en el orden de ORDEN_GRUPOS (base primero).
function repartirEnCategorias(esquema) {
  const ordenados = [...esquema].sort((a, b) => (a.grupo === 'base' ? -1 : posicionGrupo(a.grupo)) - (b.grupo === 'base' ? -1 : posicionGrupo(b.grupo)));
  const reparto = new Map(CATEGORIAS.map((categoria) => [categoria, new Map()]));
  for (const campo of ordenados) {
    const destino = categoriaDe(campo);
    if (!destino) continue;
    const subgrupos = reparto.get(destino.categoria);
    if (!subgrupos.has(destino.subgrupo)) subgrupos.set(destino.subgrupo, []);
    subgrupos.get(destino.subgrupo).push(campo);
  }
  return reparto;
}

// General va en el contenedor base (su acordeon lo crea la tarjeta); el resto, en acordeones dentro del panel.
function montarPorCategorias(overlay, base, panel) {
  const abiertos = estadoAcordeones(panel);
  const reparto = repartirEnCategorias(ESQUEMAS[overlay]);
  base.replaceChildren(...crearCuerpoDeCampos(overlay, reparto.get('general').get(undefined) ?? []).children, ...base.querySelectorAll(':scope > [data-campos-fijo]'));
  panel.querySelectorAll('.cfg-grupo, .cfg-acordeon').forEach((acordeon) => acordeon.remove());
  for (const categoria of CATEGORIAS.filter((nombre) => nombre !== 'general' && reparto.get(nombre).size)) {
    panel.appendChild(crearAcordeonCategoria(overlay, categoria, reparto.get(categoria), abiertos));
  }
}

/**
 * Dibuja los campos de un overlay a partir de su esquema, repartidos en las categorias de `categorias.js`
 * (General y Apariencia abiertas; Animaciones, Posicion y Avanzado cerradas). Las capas GIF siguen con el grupo
 * `base` siempre visible y el resto en secciones plegables cerradas.
 * Se llama de nuevo al cambiar de idioma (las etiquetas se traducen al crear).
 */
export function montarCamposOverlay(overlay) {
  const grupos = agruparPorGrupo(ESQUEMAS[overlay]);
  const base = document.querySelector(`[data-campos-base="${overlay}"]`);
  const panel = document.querySelector(`[data-campos-panel="${overlay}"]`);
  // Las capas GIF y el inspector prestado al editor de canvas conservan su panel de siempre (disposicion.js).
  if (panel && !esCapaGif(overlay) && base.closest('.ovl-inspector')?.dataset.disposicion !== 'clasico') {
    montarPorCategorias(overlay, base, panel);
    return montarModo(overlay);
  }

  // [data-campos-fijo]: datos que no son ajustes (ej. seguidores actuales); se conservan al redibujar.
  base.replaceChildren(...grupos.get('base').filter(({ ui }) => ui !== 'oculto').map((campo) => crearCampo(overlay, campo)), ...base.querySelectorAll(':scope > [data-campos-fijo]'));
  grupos.delete('base');

  if (!panel) return;
  panel.querySelectorAll('.cfg-grupo, .cfg-acordeon').forEach((grupo) => grupo.remove());
  const ordenados = [...grupos].sort(([a], [b]) => posicionGrupo(a) - posicionGrupo(b));
  for (const [grupo, campos] of ordenados) {
    if (campos.some(({ ui }) => ui !== 'oculto')) panel.appendChild(crearGrupo(overlay, grupo, campos));
  }
}
