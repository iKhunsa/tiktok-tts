'use strict';

const estado = require('./estado-sesion');

// Las 6 rutas /api/auth/* de la app. Son proxies finos a servicio-cuentas
// (via cliente): la app agrega/gestiona el token, servicio-cuentas habla con
// Supabase/Polar. Todas detras de subscriptionsEnabled (si off -> 404).

function propagarError(res, r, logger) {
  if (r.status === 0 || !r.body) {
    logger.log('warn', 'auth', 'auth/routes.js#propagarError', 'auth.servicio.error',
      'servicio-cuentas no disponible', { status: r.status });
    return res.status(502).json({ error: 'Servicio de cuentas no disponible', errorKey: 'errors.serviceUnavailable' });
  }
  const b = r.body;
  return res.status(r.status).json({ error: b.error || 'Error', errorKey: b.errorKey || 'errors.generic' });
}

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

  app.patch('/api/auth/account', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const r = await cliente.account(token, { nombre: (req.body || {}).nombre });
    if (!r.ok) return propagarError(res, r, logger);
    const s = await cliente.session(token); // re-hidrata el estado completo
    if (s.ok) estado.aplicar({ session: s.body }, logger);
    res.json(estado.getSesion());
  });

  app.post('/api/auth/checkout', guard, async (req, res) => {
    const token = estado.getToken();
    if (!token) return res.status(401).json({ error: 'No autenticado', errorKey: 'errors.unauthorized' });
    const r = await cliente.checkout(token, { plan: (req.body || {}).plan || 'pro' });
    if (!r.ok) return propagarError(res, r, logger);
    logger.log('info', 'auth', 'auth/routes.js#checkout', 'auth.checkout.solicitado', 'Checkout iniciado', {});
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

  return 8;
}

module.exports = { montar };
