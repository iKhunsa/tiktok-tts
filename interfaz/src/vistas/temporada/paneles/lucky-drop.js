import { crearRuleta } from '../../../componentes/ruleta/crear-ruleta.js';
import { crearTarjetaPremio } from '../../../componentes/ruleta/crear-tarjeta-premio.js';
import { ponerFondo } from '../poner-fondo.js';
import { repartirCasillas } from '../../../componentes/ruleta/geometria.js';
import { PREMIOS, PRECIO_GIRO } from '../premios.js';
import { gastarMonedas } from '../saldo.js';
import { avisarSinMonedas } from '../avisar-sin-monedas.js';
import { activarConEspacio } from '../activar-con-espacio.js';
import { PREMIOS_MISTERIOSOS } from '../premios-misteriosos.js';
import { abrirBolaMisteriosa } from '../abrir-bola-misteriosa.js';
import { premioEnOrden } from '../premio-en-orden.js';
import { presentarPremios } from '../presentar-premios.js';
import { nuevoPanel } from './nuevo-panel.js';

const CASILLAS = 14;
// REVISION: los premios salen en orden, sin probabilidades. Antes de publicar, usar `sortearPremio` (../sortear-premio.js).
const elegirPremio = premioEnOrden;

async function girar(ruleta, tarjeta) {
  const id = await elegirPremio(PREMIOS);
  await ruleta.girarHasta(id);
  const { icono } = PREMIOS.find((premio) => premio.id === id);
  tarjeta.mostrar({ clave: `temporada.luckyDrop.${id}`, icono });
  if (id === 'mysteryBall') tarjeta.pedir('abrir');
}

async function abrir(ruleta, tarjeta) {
  const id = await elegirPremio(PREMIOS_MISTERIOSOS);
  const cierre = abrirBolaMisteriosa(id, ruleta.premio); // mide la bola antes de que la ruleta la retire
  ruleta.limpiar();
  await cierre;
  const { icono } = PREMIOS_MISTERIOSOS.find((premio) => premio.id === id);
  tarjeta.mostrar({ clave: `temporada.mysteryBall.${id}`, icono });
  tarjeta.pedir('girar');
}

/**
 * Lucky Drop: la ruleta de premios con su tarjeta y, a la derecha, el panel de premios, que se abre con la pestana roja
 * de su borde (plegado para no tapar la ruleta, salvo en la presentacion de la primera visita).
 */
export function crearPanelLuckyDrop() {
  const panel = nuevoPanel('temporada-lucky');
  const premios = PREMIOS.map(({ id, icono }) => `<li class="temporada-premio"><img class="temporada-premio-icono" src="${icono}" alt="">
    <strong data-i18n="temporada.luckyDrop.${id}.nombre"></strong>
    <span data-i18n="temporada.luckyDrop.${id}.descripcion"></span></li>`);
  panel.innerHTML = `
    <aside class="temporada-premios is-plegado" data-premios>
      <button type="button" class="temporada-premios-alternar" aria-expanded="false" data-alternar data-i18n-aria-label="temporada.luckyDrop.alternar"></button>
      <h2 data-i18n="temporada.luckyDrop.premios"></h2>
      <ul>${premios.join('')}</ul>
    </aside>`;

  const ruleta = crearRuleta({ casillas: repartirCasillas(PREMIOS, CASILLAS) });
  const tarjeta = crearTarjetaPremio({ precio: PRECIO_GIRO });
  ruleta.elemento.append(tarjeta.elemento);
  panel.prepend(ruleta.elemento);
  ponerFondo(panel, 'img/eventos/winter/lucky-drop.webp');
  tarjeta.pedir('girar');
  tarjeta.mostrar({ clave: 'temporada.luckyDrop.listo' });

  const acciones = { girar, abrir };
  tarjeta.boton.addEventListener('click', async () => {
    const accion = tarjeta.accion();
    if (accion === 'girar' && !gastarMonedas(PRECIO_GIRO)) {
      avisarSinMonedas(PRECIO_GIRO);
      return;
    }
    tarjeta.ocupar(true);
    try {
      await acciones[accion](ruleta, tarjeta);
    } finally {
      tarjeta.ocupar(false);
    }
  });

  const lateral = panel.querySelector('[data-premios]');
  const alternar = panel.querySelector('[data-alternar]');
  const desplegar = (abierto) => {
    lateral.classList.toggle('is-plegado', !abierto);
    alternar.setAttribute('aria-expanded', String(abierto));
  };
  alternar.addEventListener('click', () => desplegar(lateral.classList.contains('is-plegado')));
  presentarPremios(panel, lateral, desplegar);
  activarConEspacio(panel, tarjeta.boton);
  return panel;
}
