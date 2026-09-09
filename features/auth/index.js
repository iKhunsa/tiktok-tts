'use strict';

const mcpRegistry = require('../../core/contracts/mcp-registry');
const entitlementsContract = require('../../core/contracts/entitlements');
const { resolverUrl } = require('./config-servicio');
const { crearCliente } = require('./cliente-servicio');
const { crearRefresh } = require('./refresh');
const { crearCheck } = require('./gating');
const rutas = require('./routes');
const estado = require('./estado-sesion');

// Dominio de cuentas + suscripciones. Habla con servicio-cuentas (VPS) por REST;
// nunca con Supabase/Polar directo. Sin CUENTAS_URL configurada -> no-op:
// rutas 404, auth:get devuelve sesion vacia, entitlements respeta el flag.
// Se monta entre configuracion y mcp en server.js.

module.exports = {
  name: 'auth',

  register({ app, bus, logger }) {
    // Snapshot de config (subscriptionsEnabled) + re-lectura en config:actualizado.
    let subsEnabled = false;
    const leerConfig = () => {
      bus.emit('config:get', (c) => { subsEnabled = c && c.subscriptionsEnabled === true; });
    };
    leerConfig();
    bus.on('config:actualizado', ({ keysChanged } = {}) => {
      if (!keysChanged || keysChanged.includes('subscriptionsEnabled')) leerConfig();
    }, 'auth');

    const subscriptionsEnabled = () => subsEnabled;

    // Contrato de gating: disponible SIEMPRE (respeta el flag internamente).
    entitlementsContract.provide(crearCheck(subscriptionsEnabled));

    // Contrato de lectura de sesion.
    bus.on('auth:get', (respond) => {
      if (typeof respond === 'function') respond(estado.getSesion());
    }, 'auth');

    // ── MCP: estado + tools ──────────────────────────────────────────────
    mcpRegistry.registerStateProvider(() => {
      const s = estado.getSesion();
      return { auth: { signedIn: s.signedIn, plan: s.plan, entitlements: s.entitlements, degraded: s.degraded } };
    }, 'auth');

    mcpRegistry.registerTool({
      name: 'auth_status', domain: 'auth', readOnly: true,
      title: 'Account status',
      description: 'Current account: signed in?, plan (free/pro), unlocked feature ids. No token.',
      inputSchema: { type: 'object', properties: {} },
      handler: () => {
        const s = estado.getSesion();
        return { signedIn: s.signedIn, email: s.user && s.user.email, plan: s.plan, entitlements: s.entitlements, expiresAt: s.expiresAt };
      },
    });

    const urlServicio = resolverUrl();

    if (!urlServicio) {
      // No-op: sin servicio configurado. auth:get / entitlements siguen vivos.
      logger.log('info', 'auth', 'auth/index.js#register', 'auth.servicio.no_configurado',
        'CUENTAS_URL no configurada — dominio auth en no-op', {});
      // auth_logout igual se registra (destructive) para no romper el catalogo MCP.
      mcpRegistry.registerTool({
        name: 'auth_logout', domain: 'auth', destructive: true,
        title: 'Log out', description: 'Clear the local session.',
        inputSchema: { type: 'object', properties: {} },
        handler: () => ({ ok: false, reason: 'servicio no configurado' }),
      });
      return { rutas: 0, listeners: 2 };
    }

    const cliente = crearCliente(urlServicio);
    estado.hidratarDesdeDisco();
    const refresh = crearRefresh({ cliente, bus, logger });

    const nRutas = rutas.montar({ app, cliente, logger, subscriptionsEnabled, refresh });

    mcpRegistry.registerTool({
      name: 'auth_logout', domain: 'auth', destructive: true,
      title: 'Log out', description: 'Clear the local session (also tells the accounts service).',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const token = estado.getToken();
        if (token) await cliente.logout(token).catch(() => {});
        estado.cerrar(logger);
        bus.emit('auth:actualizado', { signedIn: false, plan: 'free' });
        bus.emit('ws:broadcast', { type: 'auth-updated', session: estado.getSesion() });
        return { ok: true };
      },
    });

    refresh.start(); // setInterval .unref()'d — no hace falta limpiarlo al salir
    logger.log('info', 'auth', 'auth/index.js#register', 'auth.servicio.configurado',
      `Dominio auth activo contra ${urlServicio}`, { subscriptionsEnabled: subsEnabled });

    return { rutas: nRutas, listeners: 3 };
  },
};
