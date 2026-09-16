'use strict';

const MAX_TABS = 6;
const PARTITION_NAME = 'persist:portal-view';

const MIN_PANEL_WIDTH_PX = 420;
const DEFAULT_PANEL_WIDTH_PCT = 0.5;
const MAX_PANEL_WIDTH_PCT = 0.75;
// Sidebar fijo (210px, interfaz/src/estilos/index-legacy.css) + minimo de
// .main-area usable (formularios/botones sin romper wrap). No hay un
// min-width ya documentado en el CSS para derivarlo con exactitud — validar
// en pantalla y ajustar si hace falta.
const LEFT_MIN_PX = 640;
const COMBINED_MIN_WIDTH_PX = LEFT_MIN_PX + MIN_PANEL_WIDTH_PX;

const TAB_BAR_HEIGHT_PX = 36;
const TOOLBAR_HEIGHT_PX = 40;
// Alto HTML real que el WebContentsView debe dejar libre arriba (tab-bar +
// toolbar apiladas) — ver electron-shell/portal-view/bounds.js#computeBounds.
const CONTENT_TOP_OFFSET_PX = TAB_BAR_HEIGHT_PX + TOOLBAR_HEIGHT_PX;
const DEFAULT_FAVORITE_ICON = 'public';

module.exports = {
  MAX_TABS,
  PARTITION_NAME,
  MIN_PANEL_WIDTH_PX,
  DEFAULT_PANEL_WIDTH_PCT,
  MAX_PANEL_WIDTH_PCT,
  LEFT_MIN_PX,
  COMBINED_MIN_WIDTH_PX,
  TAB_BAR_HEIGHT_PX,
  TOOLBAR_HEIGHT_PX,
  CONTENT_TOP_OFFSET_PX,
  DEFAULT_FAVORITE_ICON,
};
