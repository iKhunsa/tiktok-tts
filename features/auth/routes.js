'use strict';

const estado = require('./estado-sesion');
const { removeAccountData } = require('../../core/account-data-path');

// Las rutas de cuentas de la app. Son proxies finos a servicio-cuentas (via
// cliente): la app agrega/gestiona el token, servicio-cuentas habla con
// Supabase/Polar. Todas detras de subscriptionsEnabled (si off -> 404).
// Prefijo segun el router de servicio-cuentas que atiende cada una: register/
// login/google/logout van bajo /api/auth/*; todo lo de account.js (perfil,
// identidades, vincular Google, borrar cuenta) cuelga de /api/account*, sin
// /auth — asi estaba /api/account desde antes de esta feature.

function propagarError(res, r, logger) {
  if (r.status === 0 || !r.body) {
    logger.log('warn', 'auth', 'auth/routes.js#propagarError', 'auth.servicio.error',
      'servicio-cuentas no disponible', {
        status: r.status,
        causa: r.error && ((r.error.cause && r.error.cause.code) || r.error.message),
      });
    return res.status(502).json({ error: 'Servicio de cuentas no disponible', errorKey: 'errors.serviceUnavailable' });
  }
  const b = r.body;
  return res.status(r.status).json({ error: b.error || 'Error', errorKey: b.errorKey || 'errors.generic' });
}

// Cualquier valor distinto de 'month' cae al default del contrato: anual.
const intervaloValido = (v) => (v === 'month' ? 'month' : 'year');

function montar({ app, cliente, logger, subscriptionsEnabled, refresh }) {
  const guard = (req, res, next) => (subscriptionsEnabled() ? next() : res.status(404).end());

  app.post('/api/auth/register', guard, async (req, res) => {
    const { email, password, nombre } = req.body || {};
    const antes = estado.getSesion();
    const r = await cliente.register({ email, password, nombre });
    if (!r.ok) return propagarError(res, r, logger);
    estado.aplicar({ token: r.body.token, session: r.body }, logger);
    logger.log('info', 'auth', 'auth/routes.js#register', 'auth.sesion.iniciada', 'Registro OK', { via: 'register' });
    refresh.emitirCambio(antes, estado.getSesion());
    res.json(estado.getSesion());
  });

  app.post('/api/auth/login', guard, async (req, res) => {
    const { email, password } = req.body || {};
    const antes = estado.getSesion();
    const r = await cliente.login({ email, password });
    if (!r.ok) return propagarError(res, r, logger);
    estado.aplicar({ token: r.body.token, session: r.body }, logger);
    logger.log('info', 'auth', 'auth/routes.js#login', 'auth.sesion.iniciada', 'Login OK', { via: 'login' });
    refresh.emitirCambio(antes, estado.getSesion());
    res.json(estado.getSesion());
  });

  app.post('/api/auth/google', guard, async (req, res) => {
    const { code, codeVerifier, redirectUri, nombre } = req.body || {};
    const antes = estado.getSesion();
    const r = await cliente.google({ code, codeVerifier, redirectUri, nombre });
    if (!r.ok) return propagarError(res, r, logger);
    estado.aplicar({ token: r.body.token, session: r.body }, logger);
    logger.log('info', 'auth', 'auth/routes.js#google', 'auth.sesion.iniciada', 'Login/registro con Google OK', { via: 'google' });
    refresh.emitirCambio(antes, estado.getSesion());
    res.json(estado.getSesion());
  });

  // Sin sesion (se usa antes de registrarse): sin guard de token, solo el
  // de subscriptionsEnabled. No toca estado.
  app.get('/api/auth/nickname-disponible', guard, async (req, res) => {
    const r = await cliente.nicknameDisponible(String(req.query.nombre || ''));
    if (!r.ok) return propagarError(res, r, logger);
    res.json(r.body);
  });

  // Sin sesion (se usa desde la pantalla de login, antes de loguearse): sin
  // guard de token, solo el de subscriptionsEnabled. No toca estado.
  app.post('/api/auth/forgot-password', guard, async (req, res) => {
    const { email } = req.body || {};
    const r = await cliente.forgotPassword({ email });
    if (!r.ok) return propagarError(res, r, logger);
    res.json(r.body);
  });

  app.post('/api/auth/reset-password', guard, async (req, res) => {
    const { email, code, newPassword } = req.body || {};
    const r = await cliente.resetPassword({ email, code, newPassword });
    if (!r.ok) return propagarError(res, r, logger);
    res.json(r.body);
  });

  app.post('/api/auth/logout', guard, async (req, res) => {
    const token = estado.getToken();
    const antes = estado.getSesion();
    if (token) await cliente.logout(token);
    estado.cerrar(logger);
    logger.log('info', 'auth', 'auth/routes.js#logout', 'auth.sesion.cerrada', 'Logout', {});
    refresh.emitirCambio(antes, estado.getSesion());
    res.json({ ok: true });
  });

  app.get('/api/auth/session', guard, (req, res) => {
    res.json(estado.getSesion());
  });

  // account.js entero (perfil, identidades, vincular Google, borrar cuenta)
  // cuelga de /api/account* en servicio-cuentas, sin el prefijo /auth — a
  // diferencia de register/login/google/logout, que si van bajo /api/auth/*.
  app.patch('/api/account', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const r = await cliente.account(token, { nombre: (req.body || {}).nombre });
    if (!r.ok) return propagarError(res, r, logger);
    const s = await cliente.session(token); // re-hidrata el estado completo
    if (s.ok) estado.aplicar({ session: s.body }, logger);
    res.json(estado.getSesion());
  });

  app.get('/api/account/identities', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const r = await cliente.identities(token);
    if (!r.ok) return propagarError(res, r, logger);
    res.json(r.body);
  });

  app.post('/api/account/link/google', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const { code, codeVerifier, redirectUri } = req.body || {};
    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({ error: 'Faltan datos de Google', errorKey: 'errors.invalidBody' });
    }
    const r = await cliente.linkGoogle(token, { code, codeVerifier, redirectUri });
    if (!r.ok) return propagarError(res, r, logger);
    res.json(r.body);
  });

  // Foto de perfil / banner (Cloudinary, ver docs/plan-avatar-banner.md):
  // el backend solo firma, el archivo sube DIRECTO del cliente a Cloudinary,
  // nunca pasa por aca. "firma" devuelve los parametros para esa subida;
  // "confirmar" solo toca el timestamp de cache-busting y re-hidrata la
  // sesion para que el proximo estadoCuenta() traiga la URL nueva.
  function montarFirmaYConfirmar(tipo, firma, confirmar) {
    app.post(`/api/account/${tipo}/firma`, guard, async (req, res) => {
      const token = estado.getToken();
      if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
      const r = await firma(token);
      if (!r.ok) return propagarError(res, r, logger);
      res.json(r.body);
    });

    app.post(`/api/account/${tipo}/confirmar`, guard, async (req, res) => {
      const token = estado.getToken();
      if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
      const r = await confirmar(token);
      if (!r.ok) return propagarError(res, r, logger);
      const s = await cliente.session(token); // re-hidrata: avatarUrl/bannerUrl nuevo
      if (s.ok) estado.aplicar({ session: s.body }, logger);
      res.json(estado.getSesion());
    });
  }

  montarFirmaYConfirmar('avatar', cliente.avatarFirma, cliente.avatarConfirmar);
  montarFirmaYConfirmar('banner', cliente.bannerFirma, cliente.bannerConfirmar);

  // Twitch/Kick vinculados (ver docs/plan-twitch-kick.md, FASE 1). El canal en
  // tiempo real (FASE 3) vive aparte, en plataformas-realtime.js — no hay
  // ruta HTTP para eso, es un WS propio hacia servicio-cuentas.
  app.get('/api/account/platforms', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const r = await cliente.platforms(token);
    if (!r.ok) return propagarError(res, r, logger);
    res.json(r.body);
  });

  function montarLinkPlataforma(plataforma, camposRequeridos, linkFn) {
    app.post(`/api/account/link/${plataforma}`, guard, async (req, res) => {
      const token = estado.getToken();
      if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
      const body = req.body || {};
      if (camposRequeridos.some((campo) => !body[campo])) {
        return res.status(400).json({ error: 'Faltan datos', errorKey: 'errors.invalidBody' });
      }
      const r = await linkFn(token, body);
      if (!r.ok) return propagarError(res, r, logger);
      res.json(r.body);
    });
  }

  montarLinkPlataforma('twitch', ['code', 'redirectUri'], cliente.linkTwitch);
  montarLinkPlataforma('kick', ['code', 'codeVerifier', 'redirectUri'], cliente.linkKick);

  app.delete('/api/account/link/:plataforma', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const { plataforma } = req.params;
    if (!['twitch', 'kick'].includes(plataforma)) return res.status(404).end();
    const r = await cliente.unlinkPlatform(token, plataforma);
    if (!r.ok) return propagarError(res, r, logger);
    res.json(r.body);
  });

  // Mandar un mensaje al chat de la plataforma vinculada (FASE 4). Siempre
  // como el usuario mismo (no hay "bot" aparte, cada uno vincula su cuenta).
  app.post('/api/platforms/:plataforma/chat', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const { plataforma } = req.params;
    if (!['twitch', 'kick'].includes(plataforma)) return res.status(404).end();
    const { mensaje } = req.body || {};
    if (typeof mensaje !== 'string' || !mensaje) {
      return res.status(400).json({ error: 'Falta el mensaje', errorKey: 'errors.invalidBody' });
    }
    const r = await cliente.chatPlatform(token, plataforma, { mensaje });
    if (!r.ok) return propagarError(res, r, logger);
    res.json(r.body);
  });

  // Eliminacion de cuenta: irreversible. Solo cierra sesion y borra datos locales
  // si el backend confirmo el borrado. NO se expone como tool MCP a proposito:
  // es destructiva y exige contrasena o reconfirmar con Google (un agente no
  // tiene ninguna de las dos). El body trae {password} o {code, codeVerifier,
  // redirectUri} segun que metodo eligio el usuario en la pantalla de borrado.
  app.delete('/api/account', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const { password, code, codeVerifier, redirectUri } = req.body || {};
    const conPassword = typeof password === 'string' && password;
    const conGoogle = code && codeVerifier && redirectUri;
    if (!conPassword && !conGoogle) {
      return res.status(400).json({ error: 'Falta la contrasena o la confirmacion de Google', errorKey: 'errors.invalidBody' });
    }
    const antes = estado.getSesion();
    const r = await cliente.eliminarCuenta(token, conPassword ? { password } : { code, codeVerifier, redirectUri });
    if (!r.ok) return propagarError(res, r, logger);
    estado.cerrar(logger);
    logger.log('info', 'auth', 'auth/routes.js#eliminarCuenta', 'auth.cuenta.eliminada', 'Cuenta eliminada', {});
    refresh.emitirCambio(antes, estado.getSesion());
    removeAccountData(antes.user.id);
    res.json(estado.getSesion());
  });

  app.post('/api/auth/checkout', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const body = req.body || {};
    const pedido = { plan: body.plan || 'pro', intervalo: intervaloValido(body.intervalo) };
    const r = await cliente.checkout(token, pedido);
    if (!r.ok) return propagarError(res, r, logger);
    logger.log('info', 'auth', 'auth/routes.js#checkout', 'auth.checkout.solicitado', 'Checkout iniciado', pedido);
    res.json({ url: r.body.url });
  });

  app.post('/api/auth/subscription/cancel', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const antes = estado.getSesion();
    const r = await cliente.cancelarSuscripcion(token);
    if (!r.ok) return propagarError(res, r, logger);
    logger.log('info', 'auth', 'auth/routes.js#cancelarSuscripcion', 'auth.suscripcion.cancelada', 'Cancelacion solicitada', {});
    const s = await cliente.session(token); // re-hidrata: cancel_at_period_end ya actualizado (optimista del lado del servicio)
    if (s.ok) estado.aplicar({ session: s.body }, logger);
    refresh.emitirCambio(antes, estado.getSesion());
    res.json(estado.getSesion());
  });

  app.post('/api/auth/subscription/resume', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const antes = estado.getSesion();
    const r = await cliente.reanudarSuscripcion(token);
    if (!r.ok) return propagarError(res, r, logger);
    logger.log('info', 'auth', 'auth/routes.js#reanudarSuscripcion', 'auth.suscripcion.reanudada', 'Reanudacion solicitada', {});
    const s = await cliente.session(token);
    if (s.ok) estado.aplicar({ session: s.body }, logger);
    refresh.emitirCambio(antes, estado.getSesion());
    res.json(estado.getSesion());
  });

  app.post('/api/auth/subscription/change-interval', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const { intervalo } = req.body || {};
    if (!['month', 'year'].includes(intervalo)) return res.status(400).json({ error: 'Intervalo invalido', errorKey: 'errors.generic' });
    const r = await cliente.cambiarIntervalo(token, { intervalo });
    if (!r.ok) return propagarError(res, r, logger);
    logger.log('info', 'auth', 'auth/routes.js#cambiarIntervalo', 'auth.suscripcion.intervalo_cambiado', 'Cambio de intervalo solicitado', {});
    const s = await cliente.session(token); // re-hidrata: subscription.nextInterval ya actualizado
    if (s.ok) estado.aplicar({ session: s.body }, logger);
    res.json(estado.getSesion());
  });

  return 20;
}

module.exports = { montar };
