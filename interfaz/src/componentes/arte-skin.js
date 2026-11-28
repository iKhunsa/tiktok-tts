// Skins con portada propia (publico/img/skins/<skin>.webp); el resto usa la miniatura dibujada en CSS.
const CON_PORTADA = new Set(['vinilo', 'widgetPequeno', 'widgetMediano', 'widgetGrande']);

export function arteSkin(skin) {
  return CON_PORTADA.has(skin)
    ? `<img src="img/skins/${skin}.webp" alt="" loading="lazy" decoding="async">`
    : `<span class="ovl-skin-miniatura" data-skin="${skin}"><i></i><i></i></span>`;
}
