import { leerAccesoOverlays } from './compartido/acceso-reproduccion.js';
import { transicionar, TIPOS_TRANSICION } from './compartido/transiciones-escena.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
// Una escena del editor de canvas en una sola Browser Source. ?e=<id> es estatico: las capas (direcciones relativas de
// overlays, de abajo hacia arriba) se leen del respaldo de ajustes y se revisan cada segundo, asi mover una capa en el
// editor se ve en OBS sin recargar. ?e=dinamica sigue la escena activa (appSettings.escenaActivaId), que cambia con
// los atajos de teclado por escena: una sola Browser Source refleja cualquier escena sin tocar la URL en OBS.
// ?l= (enlaces antiguos) lista las capas directamente.
// Solo se aceptan paginas overlay de este mismo origen.
registrarErroresOverlay(); // los errores de esta pagina (OBS no tiene consola) llegan a los logs de la app
const params = new URLSearchParams(location.search);
const id = params.get('e');
const raiz = document.body.appendChild(document.createElement('div'));
raiz.id = 'escenario';
let escenaPrevia; // sin definir hasta la primera lectura: cargar la pagina no es cambiar de escena
let enTransicion = false;
let buildInicial; // version de esta pagina en el servidor: si cambia, el codigo cargado es viejo

const alCargar = (marco) => new Promise((resolver) => { marco.addEventListener('load', resolver, { once: true }); setTimeout(resolver, 1500); });

/** Una escena: una capa con un marco por overlay. Al cambiar de escena con transicion, la nueva se arma en otra capa. */
function crearCapa() {
  const elemento = raiz.appendChild(document.createElement('div'));
  elemento.className = 'capa';
  const marcos = [];
  /** Pone los marcos de `destinos`; devuelve una promesa que se cumple cuando cargaron los que cambiaron. */
  function aplicar(destinos) {
    destinos = destinos.filter((d) => /^\/overlay-(?!escena)[\w-]+\.html(\?|$)/.test(d));
    const cargas = [];
    destinos.forEach((d, i) => { // solo se recarga el marco cuya direccion cambio
      if (!marcos[i]) elemento.append(marcos[i] = document.createElement('iframe'));
      if (marcos[i].getAttribute('src') !== d) { cargas.push(alCargar(marcos[i])); marcos[i].src = d; }
    });
    while (marcos.length > destinos.length) marcos.pop().remove();
    return Promise.all(cargas);
  }
  return { elemento, aplicar };
}
let actual = crearCapa();

async function cambiarConTransicion(urls, transicion) {
  const nueva = crearCapa();
  nueva.elemento.style.visibility = 'hidden'; // se ve cuando la transicion la muestra
  try {
    await nueva.aplicar(urls);
    await transicionar(actual.elemento, nueva.elemento, transicion);
  } catch (error) {
    // La escena nueva se pone igual (a corte): una transicion que falla no puede dejar el overlay vacio.
    window.dispatchEvent(new window.ErrorEvent('error', { message: `transicion ${transicion.tipo}: ${error.message}`, error }));
  } finally {
    nueva.elemento.style.visibility = '';
    actual.elemento.remove();
    actual = nueva;
  }
}

async function leer() {
  if (enTransicion) return;
  try {
    const respuesta = await fetch(`/api/overlays/escena?e=${encodeURIComponent(id)}&v=2`, { cache: 'no-store' });
    const datos = respuesta.ok ? await respuesta.json() : {};
    if (datos.build) {
      buildInicial ??= datos.build;
      if (datos.build !== buildInicial) { location.reload(); return; }
    }
    const cambioDeEscena = escenaPrevia !== undefined && datos.escenaId !== escenaPrevia;
    escenaPrevia = datos.escenaId;
    if (!cambioDeEscena || !TIPOS_TRANSICION.includes(datos.transicion?.tipo)) { actual.aplicar(datos.urls || []); return; }
    enTransicion = true;
    await cambiarConTransicion(datos.urls || [], datos.transicion);
  } catch (_) { actual.aplicar([]); } finally { enTransicion = false; }
}

async function actualizar() {
  if (id) return leer();
  const acceso = await leerAccesoOverlays();
  actual.aplicar(acceso.pro ? params.getAll('l') : []);
}
actualizar();
setInterval(actualizar, 1000);
