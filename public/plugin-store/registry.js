'use strict';

// ─── SIDEBAR TOOL REGISTRY ("Más herramientas" / Tienda de plugins) ────
// Fuente de verdad de todo lo que puede aparecer en la barra lateral.
// Agregar una tool nueva a futuro = agregar una entrada acá (+ su
// <div class="view"> y lógica en otro lado) — nace oculta por defecto,
// aparece en la tienda para que el usuario la sume si quiere.
// `media` = ruta a una imagen/video de vista previa (opcional). Sin media,
// el detalle muestra un placeholder con el ícono del feature.
// `aboutKey` = descripción larga que se muestra en el detalle, debajo de
// Estado/Posición. Solo aplica a tools no fijas (las fijas no tienen ese bloque).
const SIDEBAR_TOOLS = [
  { id: 'chat',       icon: 'icons/chat.svg',       labelKey: 'nav.chat',       descKey: 'store.desc.chat',       pinned: true,  media: null },
  { id: 'overlays',   icon: 'icons/tv.svg',         labelKey: 'nav.overlays',   descKey: 'store.desc.overlays',   pinned: false, media: null, aboutKey: 'store.about.overlays' },
  { id: 'clips',      icon: 'icons/play_arrow.svg', labelKey: 'nav.clips',      descKey: 'store.desc.clips',      pinned: false, media: null, aboutKey: 'store.about.clips' },
  { id: 'soundpad',   icon: 'icons/volume_up.svg',  labelKey: 'nav.soundpad',   descKey: 'store.desc.soundpad',   pinned: false, media: null, aboutKey: 'store.about.soundpad' },
  { id: 'mobile',     icon: 'icons/smartphone.svg', labelKey: 'nav.mobile',     descKey: 'store.desc.mobile',     pinned: false, media: null, aboutKey: 'store.about.mobile' },
  { id: 'bot',        icon: 'icons/music_note.svg', labelKey: 'nav.bot',        descKey: 'store.desc.bot',        pinned: false, media: null, aboutKey: 'store.about.bot' },
  { id: 'moderacion', icon: 'icons/people.svg',     labelKey: 'nav.moderation', descKey: 'store.desc.moderacion', pinned: false, media: null, aboutKey: 'store.about.moderacion' },
  { id: 'settings',   icon: 'icons/settings.svg',   labelKey: 'nav.settings',   descKey: 'store.desc.settings',   pinned: true,  media: null },
];
// Tools visibles por defecto la primera vez que arranca la app (sin prefs
// guardadas aún) o para usuarios que venían de antes de que existiera la
// tienda. 'clips' y 'mobile' quedan ocultas de base — el usuario las activa
// desde la tienda de plugins si las quiere.
const SIDEBAR_TOOLS_LEGACY_VISIBLE = ['chat', 'overlays', 'soundpad', 'bot', 'moderacion', 'settings'];

function toolById(id) {
  return SIDEBAR_TOOLS.find((tool) => tool.id === id) || null;
}
