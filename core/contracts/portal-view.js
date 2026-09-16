'use strict';

// Contrato de solo lectura entre electron-shell/portal-view/controller.js y
// features/portal-view/ — mismo idiom que entitlements.js (singleton
// require-once, default no-op seguro hasta que el productor real llame
// provide()). Se justifica por desacople: features/* nunca puede requerir
// electron-shell/* directo (el dominio Express no tiene acceso a Electron).
//
// Deliberadamente NO expone URLs ni historial — solo open/tabCount/activeTabId
// (activeTabId es un id opaco tab_<uuid>, no una URL) — para no filtrar
// navegacion del usuario a un agente MCP sin que lo haya pedido explicitamente.

let _getState = () => ({ open: false, tabCount: 0, activeTabId: null });

function provide(fn) {
  _getState = fn;
}

function getState() {
  try {
    return _getState();
  } catch (_) {
    return { open: false, tabCount: 0, activeTabId: null };
  }
}

module.exports = { provide, getState };
