const test = require('node:test');
const assert = require('node:assert/strict');

test('fotos horizontales, verticales y panoramicas cubren ambos formatos sin deformarse', async () => {
  const { escalaParaCubrir } = await import('../interfaz/compartido/estilo/escala-para-cubrir.js');
  for (const [ancho, alto] of [[1920, 1080], [1080, 1920], [4000, 300], [300, 4000]]) {
    for (const [w, h] of [[1920, 1080], [1080, 1920]]) {
      const escala = escalaParaCubrir(ancho, alto, w, h);
      const renderAncho = w * 0.2 * escala;
      const renderAlto = renderAncho * alto / ancho;
      assert.ok(renderAncho >= w - 0.001 && renderAlto >= h - 0.001);
      assert.ok(Math.abs(renderAncho - w) < 0.001 || Math.abs(renderAlto - h) < 0.001);
    }
  }
});

test('media y overlays comparten escala sin tope y conservan valores grandes en la URL', async () => {
  const { ESQUEMA_GIF, urlCapaGif } = await import('../interfaz/compartido/estilo/campos-gif.js');
  const { ESQUEMAS } = await import('../interfaz/compartido/estilo/esquemas.js');
  const { leerConfig } = await import('../interfaz/compartido/estilo/query.js');
  const { leerValorDeEntrada } = await import('../interfaz/src/vistas/principal/campos-overlay/leer-valor.js');
  for (const esquema of [ESQUEMA_GIF, ...Object.values(ESQUEMAS)]) {
    const campo = esquema.find(({ clave }) => clave === 'escala');
    if (!campo) continue;
    assert.equal(campo.max, undefined);
    assert.notEqual(campo.ui, 'rango');
    assert.equal(leerValorDeEntrada({ value: '35' }, campo), 35);
    assert.equal(leerValorDeEntrada({ value: '-1' }, campo), campo.min);
  }
  const url = urlCapaGif('http://localhost', { src: 'https://example.com/photo.png', escala: 35 });
  assert.equal(leerConfig(ESQUEMA_GIF, new URL(url).searchParams).escala, 35);
});
