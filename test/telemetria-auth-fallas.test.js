'use strict';

// auth.js (conector de telemetria) traduce log:entry de auth.servicio.error/
// auth.servicio.sin_respuesta a un track('auth','servicio_no_disponible',...)
// clasificado por causa -- sin esto, un ISP bloqueando el dominio no deja
// ningun rastro cuantificable (solo issues de GlitchTip por instalacion).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { attach, clasificarCausa } = require('../features/telemetria/connectors/auth');

function setup() {
  const bus = new EventEmitter();
  const events = [];
  const track = (connector, name, props) => events.push({ connector, name, props });
  attach(bus, track);
  return { bus, events };
}

test('clasificarCausa: baldes de red mas comunes', () => {
  assert.equal(clasificarCausa('getaddrinfo ENOTFOUND cuentas.tiklivetts.es'), 'dns');
  assert.equal(clasificarCausa('ECONNRESET'), 'conexion_reiniciada');
  assert.equal(clasificarCausa('ECONNREFUSED'), 'conexion_rechazada');
  assert.equal(clasificarCausa('CERT_HAS_EXPIRED'), 'certificado');
  assert.equal(clasificarCausa('ETIMEDOUT'), 'timeout');
  assert.equal(clasificarCausa('The operation was aborted due to timeout'), 'timeout');
  assert.equal(clasificarCausa('servicio-cuentas 503'), 'servidor_5xx');
  assert.equal(clasificarCausa(undefined), 'desconocido');
  assert.equal(clasificarCausa('texto no reconocido'), 'desconocido');
});

test('auth.servicio.error (accion del usuario) se traduce con origen "accion"', () => {
  const { bus, events } = setup();
  bus.emit('log:entry', {
    domain: 'auth', event: 'auth.servicio.error',
    data: { status: 0, causa: 'ENOTFOUND' },
  });
  assert.deepEqual(events, [
    { connector: 'auth', name: 'servicio_no_disponible', props: { causa: 'dns', origen: 'accion' } },
  ]);
});

test('auth.servicio.sin_respuesta (refresh de fondo) se traduce con origen "fondo"', () => {
  const { bus, events } = setup();
  bus.emit('log:entry', {
    domain: 'auth', event: 'auth.servicio.sin_respuesta',
    data: { status: 0, causa: 'ECONNRESET' },
  });
  assert.deepEqual(events, [
    { connector: 'auth', name: 'servicio_no_disponible', props: { causa: 'conexion_reiniciada', origen: 'fondo' } },
  ]);
});

test('sin causa (ej. 5xx agotando reintentos sin .error) cae en "desconocido", no explota', () => {
  const { bus, events } = setup();
  bus.emit('log:entry', { domain: 'auth', event: 'auth.servicio.sin_respuesta', data: { status: 503 } });
  assert.equal(events[0].props.causa, 'desconocido');
});

test('ignora eventos de otro dominio o de auth que no son este par', () => {
  const { bus, events } = setup();
  bus.emit('log:entry', { domain: 'canales', event: 'auth.servicio.error', data: { causa: 'ENOTFOUND' } });
  bus.emit('log:entry', { domain: 'auth', event: 'auth.sesion.iniciada', data: {} });
  bus.emit('log:entry', null);
  assert.deepEqual(events, []);
});
