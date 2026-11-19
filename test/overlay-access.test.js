'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { overlayAccess } = require('../core/overlay-access');

const bus = (sesion, activo = true) => ({ emit(evento, responder) {
  if (evento === 'auth:get') responder(sesion);
  if (evento === 'config:get') responder({ subscriptionsEnabled: activo });
} });

test('el servidor separa Pro de adquisiciones y rechaza Pro sin sesion o vencido', () => {
  const sesion = { signedIn: true, plan: 'free', user: { id: 'a' }, entitlements: ['skin:terminal', 'clips'], licenciasSkins: { 'epik:uno': 'adquirida' } };
  const acceso = overlayAccess(bus(sesion));
  assert.equal(acceso.pro, false);
  assert.deepEqual(acceso.adquiridas, ['skin:terminal']);
  assert.equal(acceso.licencias['epik:uno'], 'adquirida');
  assert.equal(overlayAccess(bus({ ...sesion, signedIn: false, plan: 'pro' })).pro, false);
  assert.equal(overlayAccess(bus({ ...sesion, plan: 'pro' })).pro, true);
  assert.equal(overlayAccess(bus({ ...sesion, plan: 'pro', expiresAt: '2000-01-01' })).pro, false);
  assert.equal(overlayAccess(bus(sesion, false)).pro, true);
  assert.notEqual(acceso.cuenta, overlayAccess(bus({ ...sesion, user: { id: 'b' } })).cuenta);
});
