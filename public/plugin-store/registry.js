'use strict';

// ─── SIDEBAR TOOL REGISTRY ("Más herramientas" / Tienda de plugins) ────
// Fuente de verdad de todo lo que puede aparecer en la barra lateral.
// Agregar una tool nueva a futuro = agregar una entrada acá (+ su
// <div class="view"> y lógica en otro lado) — nace oculta por defecto,
// aparece en la tienda para que el usuario la sume si quiere.
const SIDEBAR_TOOLS = [
  { id: 'chat',       icon: 'icons/chat.svg',       labelKey: 'nav.chat',       descKey: 'store.desc.chat',       pinned: true },
  { id: 'overlays',   icon: 'icons/tv.svg',         labelKey: 'nav.overlays',   descKey: 'store.desc.overlays',   pinned: false },
  { id: 'clips',      icon: 'icons/play_arrow.svg', labelKey: 'nav.clips',      descKey: 'store.desc.clips',      pinned: false },
  { id: 'soundpad',   icon: 'icons/volume_up.svg',  labelKey: 'nav.soundpad',   descKey: 'store.desc.soundpad',   pinned: false },
  { id: 'mobile',     icon: 'icons/smartphone.svg', labelKey: 'nav.mobile',     descKey: 'store.desc.mobile',     pinned: false },
  { id: 'bot',        icon: 'icons/music_note.svg', labelKey: 'nav.bot',        descKey: 'store.desc.bot',        pinned: false },
  { id: 'moderacion', icon: 'icons/people.svg',     labelKey: 'nav.moderation', descKey: 'store.desc.moderacion', pinned: false },
  { id: 'settings',   icon: 'icons/settings.svg',   labelKey: 'nav.settings',   descKey: 'store.desc.settings',   pinned: true },
];
// ids que ya existían antes de la tienda -> visibles por defecto.
// Cualquier id nuevo en SIDEBAR_TOOLS que NO esté acá nace oculto.
const SIDEBAR_TOOLS_LEGACY_VISIBLE = ['chat', 'overlays', 'clips', 'soundpad', 'mobile', 'bot', 'moderacion', 'settings'];

function toolById(id) {
  return SIDEBAR_TOOLS.find((tool) => tool.id === id) || null;
}
