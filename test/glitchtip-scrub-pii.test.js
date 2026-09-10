'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recortarData, sanearMensajeEvento } = require('../electron-shell/glitchtip');

test('recortarData descarta los campos de identidad del espectador', () => {
  const out = recortarData({
    platform: 'tiktok', userId: '12345', nick: 'Fulano', key: 'tiktok:12345',
    motivo: 'longitud', query: 'never gonna give you up', ip: '192.168.1.5',
  });
  assert.deepEqual(out, { platform: 'tiktok', motivo: 'longitud' });
});

test('sanearMensajeEvento redacta nick/ip interpolados en el texto', () => {
  assert.equal(
    sanearMensajeEvento({ event: 'moderacion.filtro.mensaje_bloqueado', message: 'Mensaje bloqueado de Fulano (tiktok): longitud', data: { nick: 'Fulano', platform: 'tiktok' } }),
    'Mensaje bloqueado de <nick> (tiktok): longitud'
  );
  assert.equal(
    sanearMensajeEvento({ event: 'movil.emparejado', message: 'Panel movil emparejado desde 192.168.1.5', data: { ip: '192.168.1.5' } }),
    'Panel movil emparejado desde <ip>'
  );
});

test('sanearMensajeEvento sigue sacando rutas home', () => {
  assert.equal(
    sanearMensajeEvento({ event: 'x.y', message: 'fallo en C:\\Users\\liber\\AppData\\Local\\foo', data: {} }),
    'fallo en C:\\Users\\<user>\\AppData\\Local\\foo'
  );
});
