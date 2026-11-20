/**
 * Winter Season: temporada de diciembre con Lucky Drop, Pase de Temporada y tienda de overlays exclusivos.
 * Una temporada nueva = un archivo como este + una linea en catalogo.js. El contenedor (anuncio, boton de la barra
 * de titulo y ventana) lo lee todo de aqui; los textos viven en las claves `temporada.<id>.*` de los idiomas.
 *
 * Contrato: { id, ventana: {desde:'MM-DD', hasta:'MM-DD'}, escena: ruta de la ilustracion (relativa a publico/),
 *             pestanas: [{ id, saldo }] }  — `saldo:true` muestra el saldo de monedas arriba a la derecha en esa pestana.
 * Cada pestana la dibuja vistas/temporada/paneles/<id>.js.
 */
export const winter = {
  id: 'winter',
  ventana: { desde: '12-01', hasta: '12-30' }, // MM-DD inclusive
  escena: 'img/eventos/winter/escena.webp',
  pestanas: [
    { id: 'inicio', saldo: false },
    { id: 'luckyDrop', saldo: true },
    { id: 'pase', saldo: true },
    { id: 'tienda', saldo: true },
  ],
};
