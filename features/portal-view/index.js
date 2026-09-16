'use strict';

// PortalView no expone rutas HTTP (navegador embebido, controlado por IPC
// desde electron-shell/portal-view/). Este dominio existe solo para que su
// estado aparezca en collectState() de MCP sin que features/mcp tenga que
// conocer electron-shell/ (regla: un dominio nunca importa el interno de otro).
const mcpRegistry = require('../../core/contracts/mcp-registry');
const portalViewContract = require('../../core/contracts/portal-view');

module.exports = {
  name: 'portal-view',
  register() {
    mcpRegistry.registerStateProvider(() => ({ portalView: portalViewContract.getState() }), 'portal-view');
    return { rutas: 0, listeners: 0 };
  },
};
