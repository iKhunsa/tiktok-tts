'use strict';

const entitlements = require('../../core/contracts/entitlements');

// Regla de negocio: 1 canal por plataforma es free; 2+ canales de la MISMA
// plataforma (2 TikTok, 2 YouTube, etc.) requiere el plan Pro (entitlement
// 'multi-canal'). Con subscriptionsEnabled=false, check() da true -> sin limite.

function yaTieneCanalDe(state, platform) {
  return state?.[`${platform}Channels`]?.size >= 1;
}

// Chequeo para connect-impl.js (path MCP + platforms-connect): lanza 403.
function assertMultiCanal(state, platform) {
  if (yaTieneCanalDe(state, platform) && !entitlements.check('multi-canal')) {
    const e = new Error(`Conectar 2+ canales de ${platform} requiere el plan Pro`);
    e.statusCode = 403;
    e.errorKey = 'errors.proRequired';
    throw e;
  }
}

// Middleware para las rutas HTTP historicas (/api/connect, /api/channels/add).
function gateMultiCanal(deps) {
  return (req, res, next) => {
    const bodyPlatform = req.body && req.body.platform;
    const platform = bodyPlatform || (req.path === '/api/connect' ? 'tiktok' : null);
    if (!platform) return next(); // sin platform en /platforms/connect o /channels/add: que el handler real reporte el campo faltante
    if (yaTieneCanalDe(deps.state, platform) && !entitlements.check('multi-canal')) {
      return res.status(403).json({
        error: `Conectar 2+ canales de ${platform} requiere el plan Pro`,
        errorKey: 'errors.proRequired',
      });
    }
    next();
  };
}

module.exports = { yaTieneCanalDe, assertMultiCanal, gateMultiCanal };
