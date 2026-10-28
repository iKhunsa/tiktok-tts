/**
 * Filtros de Moderacion con icono por opcion: un <select> nativo no puede
 * mostrar imagenes en sus opciones. Cada <select> sigue siendo la fuente del
 * valor (moderacion.js lo lee); aca solo se reemplaza su popup por un menu
 * propio, se dispara 'change' al elegir y el icono del campo muestra la
 * opcion elegida (logo de la plataforma / bolita del estado).
 */
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

  const menu = document.createElement('div');
  menu.className = 'mod-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;
  campo.appendChild(menu);

  const cerrar = () => { menu.hidden = true; select.setAttribute('aria-expanded', 'false'); };
  const abrir = () => {
    menu.replaceChildren(...[...select.options].map((o) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'mod-menu-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(o.value === select.value));
      const txt = document.createElement('span');
      txt.textContent = o.textContent; // ya traducido por data-i18n
      item.append(crearMarca(select.id, o.value), txt);
      item.addEventListener('click', () => {
        cerrar();
        if (select.value === o.value) return;
        select.value = o.value;
        select.dispatchEvent(new window.Event('change'));
      });
      return item;
    }));
    menu.hidden = false;
    select.setAttribute('aria-expanded', 'true');
    menu.querySelector('[aria-selected="true"]')?.focus();
  };

  select.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (menu.hidden) { select.focus(); abrir(); } else cerrar();
  });
  select.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); abrir(); }
  });
  menu.addEventListener('keydown', (e) => {
    const items = [...menu.children];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(i + 1, items.length - 1)]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(i - 1, 0)]?.focus(); }
    if (e.key === 'Escape' || e.key === 'Tab') { cerrar(); select.focus(); }
  });
  document.addEventListener('mousedown', (e) => { if (!menu.hidden && !campo.contains(e.target)) cerrar(); });
}

export function iniciarFiltrosConIconoMod() {
  for (const id of Object.keys(FILTROS)) {
    const select = document.getElementById(id);
    if (select) iniciarFiltro(select);
  }
}
