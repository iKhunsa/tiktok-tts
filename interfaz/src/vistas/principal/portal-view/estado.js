import { crearAlmacen } from '../../../nucleo/estado/crear-almacen.js';

// Espejo del estado real que vive en electron-shell/portal-view/controller.js
// (fuente de verdad), empujado via electronAPI.portalView.onStateChanged.
export const almacenPortalView = crearAlmacen({
  mode: 'CLOSED',
  open: false,
  tabs: [],
  activeTabId: null,
  panelWidthPct: 0.5,
  favorites: [],
});

export function aplicarEstadoPortal(state) {
  almacenPortalView.setState(state);
}
