'use strict';

const { MIN_PANEL_WIDTH_PX, MAX_PANEL_WIDTH_PCT, LEFT_MIN_PX } = require('./constants');

// Puro — sin tocar Electron. Aplica los 3 limites: piso, techo por %, techo
// secundario derivado del minimo usable del lado izquierdo.
function clampPanelWidth(desiredPx, totalWidth) {
  const maxByPct = totalWidth * MAX_PANEL_WIDTH_PCT;
  const maxByLeft = totalWidth - LEFT_MIN_PX;
  const max = Math.max(MIN_PANEL_WIDTH_PX, Math.min(maxByPct, maxByLeft));
  return Math.round(Math.min(Math.max(desiredPx, MIN_PANEL_WIDTH_PX), max));
}

// Puro — bounds relativos al contentView de la ventana (no coordenadas de
// pantalla), el panel siempre pegado al borde derecho. topOffsetPx reserva el
// alto de la toolbar/tab-bar HTML (real, no nativa) arriba del WebContentsView
// — si no se resta, la vista nativa la tapa por completo.
function computeBounds({ contentBounds, panelWidthPx, topOffsetPx = 0 }) {
  const { width, height } = contentBounds;
  const w = Math.min(panelWidthPx, width);
  return { x: width - w, y: topOffsetPx, width: w, height: Math.max(0, height - topOffsetPx) };
}

// Reaplica bounds a la vista activa cuando el usuario redimensiona la
// ventana. Devuelve una funcion de cleanup.
function attachResizeListener({ mainWindow, getPanelWidthPx, isVisible, topOffsetPx = 0, onBounds }) {
  const handler = () => {
    if (!isVisible()) return;
    const { width, height } = mainWindow.getContentBounds();
    const panelWidthPx = clampPanelWidth(getPanelWidthPx(), width);
    onBounds(computeBounds({ contentBounds: { width, height }, panelWidthPx, topOffsetPx }), panelWidthPx);
  };
  mainWindow.on('resize', handler);
  return () => mainWindow.off('resize', handler);
}

module.exports = { clampPanelWidth, computeBounds, attachResizeListener };
