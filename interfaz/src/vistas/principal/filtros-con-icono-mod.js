/**
 * Filtros de Moderacion con icono por opcion: un <select> nativo no puede
 * mostrar imagenes en sus opciones. Cada <select> sigue siendo la fuente del
 * valor (moderacion.js lo lee); aca solo se reemplaza su popup por un menu
 * propio, se dispara 'change' al elegir y el icono del campo muestra la
 * opcion elegida (logo de la plataforma / bolita del estado).
 */
import { iniciarMenuSelect } from '../../componentes/menu-select.js';

const FILTROS = {
  modPlatform: { tiktok: 'tiktok-logo.svg', twitch: 'twitch-logo.svg', youtube: 'youtube-logo.svg', kick: 'kick-logo.svg' },
  modState: { all: 'punto', clean: 'punto', muted: 'punto', banned: 'punto' },
};

// 'all' de plataforma = icono mono de cuadricula; el resto, logo o bolita.
function crearMarca(selectId, valor) {
  const icono = FILTROS[selectId][valor];
  if (icono === 'punto') {
    const punto = document.createElement('span');
    punto.className = `mod-punto ${valor}`;
    return punto;
  }
  const img = document.createElement('img');
  img.src = `icons/${icono || 'apps.svg'}`;
  img.alt = '';
  if (!icono) img.className = 'mod-icono-mono';
  return img;
}

function iniciarFiltro(select) {
  const campo = select.closest('.mod-campo');
  const marca = campo.querySelector('.mod-campo-icono');
  marca.className = 'mod-campo-marca';
  marca.removeAttribute('style');
  const pintarMarca = () => marca.replaceChildren(crearMarca(select.id, select.value));
  pintarMarca();
  select.addEventListener('change', pintarMarca);
  iniciarMenuSelect(select, campo, (valor) => crearMarca(select.id, valor));
}

export function iniciarFiltrosConIconoMod() {
  for (const id of Object.keys(FILTROS)) {
    const select = document.getElementById(id);
    if (select) iniciarFiltro(select);
  }
}
