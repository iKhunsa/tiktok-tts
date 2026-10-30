/**
 * Reemplaza el popup de un <select> nativo por un menu propio. El <select> sigue
 * siendo la fuente del valor: al elegir se dispara 'change'. El menu se monta en
 * `contenedor`, que debe estar posicionado. `crearMarca(valor)` agrega un icono opcional.
 */
export function iniciarMenuSelect(select, contenedor, crearMarca) {
  const menu = document.createElement('div');
  menu.className = 'mod-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;
  contenedor.appendChild(menu);

  const cerrar = () => { menu.hidden = true; select.setAttribute('aria-expanded', 'false'); };
  const abrir = () => {
    menu.replaceChildren(...[...select.options].filter((o) => !o.hidden).map((o) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'mod-menu-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(o.value === select.value));
      const txt = document.createElement('span');
      txt.textContent = o.textContent; // ya traducido por data-i18n
      if (crearMarca) item.append(crearMarca(o.value));
      item.append(txt);
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
  document.addEventListener('mousedown', (e) => { if (!menu.hidden && !contenedor.contains(e.target)) cerrar(); });
}
