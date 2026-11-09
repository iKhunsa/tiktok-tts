// Una skin premium guardada (p. ej. desde el editor de canvas) no debe salir hacia OBS ni la vista previa con un plan
// free. compartido/estilo/ajustes-segun-plan.js es el unico punto que decide eso; buildOverlayUrl lo aplica.

import assert from 'node:assert/strict';
import test from 'node:test';
import { ajustesSegunPlan } from '../interfaz/compartido/estilo/ajustes-segun-plan.js';
import { ESQUEMAS } from '../interfaz/compartido/estilo/esquemas.js';
import { construirQuery } from '../interfaz/compartido/estilo/query.js';

const campoSkin = (overlay) => ESQUEMAS[overlay].find((c) => c.clave === 'skin');
const conSkin = Object.keys(ESQUEMAS).filter((o) => campoSkin(o));

test('hay overlays con skin premium que cubrir (chat, ranking, musica...)', () => {
  assert.ok(conSkin.includes('chat') && conSkin.includes('likes') && conSkin.includes('musica'));
});

test('free: CUALQUIER skin premium de CUALQUIER overlay cae al default', () => {
  for (const overlay of conSkin) {
    const { premium, def } = campoSkin(overlay);
    for (const skin of premium) {
      const r = ajustesSegunPlan(ESQUEMAS[overlay], { skin, bg: 0.5 }, false);
      assert.equal(r.skin, def, `${overlay}/${skin}`);
      assert.equal(r.bg, 0.5, 'el resto de los ajustes no se toca');
    }
  }
});

test('free: la URL generada no lleva la skin premium (queda en el default, que no viaja)', () => {
  const ajustes = { ...Object.fromEntries(ESQUEMAS.chat.map((c) => [c.clave, c.def])), skin: 'terminal' };
  const aplicados = ajustesSegunPlan(ESQUEMAS.chat, ajustes, false);
  assert.ok(!construirQuery(ESQUEMAS.chat, aplicados).includes('skin='));
  assert.ok(construirQuery(ESQUEMAS.chat, ajustes).includes('skin=terminal'), 'sin el filtro, la premium si viajaria');
});

test('free: las skins libres pasan sin cambios', () => {
  for (const overlay of conSkin) {
    for (const skin of campoSkin(overlay).libres) {
      const ajustes = { skin };
      assert.equal(ajustesSegunPlan(ESQUEMAS[overlay], ajustes, false), ajustes, `${overlay}/${skin}`);
    }
  }
});

test('free: una skin .epik (no es Pro) pasa sin cambios', () => {
  const ajustes = { skin: 'epik:abc123' };
  assert.equal(ajustesSegunPlan(ESQUEMAS.chat, ajustes, false), ajustes);
});

test('con Pro (o sin sistema de cuentas): todo pasa tal cual', () => {
  for (const overlay of conSkin) {
    const ajustes = { skin: campoSkin(overlay).premium[0] };
    assert.equal(ajustesSegunPlan(ESQUEMAS[overlay], ajustes, true), ajustes);
  }
});

test('no muta lo guardado: si compra Pro, la skin premium vuelve a aplicarse', () => {
  const guardado = { skin: 'burbuja' };
  const free = ajustesSegunPlan(ESQUEMAS.chat, guardado, false);
  assert.notEqual(free, guardado);
  assert.equal(guardado.skin, 'burbuja');
  assert.equal(ajustesSegunPlan(ESQUEMAS.chat, guardado, true).skin, 'burbuja');
});

test('esquema sin campo skin o skin ausente: no rompe', () => {
  assert.deepEqual(ajustesSegunPlan([{ clave: 'bg' }], { bg: 1 }, false), { bg: 1 });
  assert.deepEqual(ajustesSegunPlan(ESQUEMAS.chat, {}, false), {});
});
