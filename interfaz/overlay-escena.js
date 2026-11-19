import { leerAccesoOverlays } from './compartido/acceso-reproduccion.js';
// Una escena del editor de canvas en una sola Browser Source. ?e=<id> es estatico: las capas (direcciones relativas de
// overlays, de abajo hacia arriba) se leen del respaldo de ajustes y se revisan cada segundo, asi mover una capa en el
// editor se ve en OBS sin recargar. ?e=dinamica sigue la escena activa (appSettings.escenaActivaId), que cambia con
// los atajos de teclado por escena: una sola Browser Source refleja cualquier escena sin tocar la URL en OBS.
// ?l= (enlaces antiguos) lista las capas directamente.
// Solo se aceptan paginas overlay de este mismo origen.
const params = new URLSearchParams(location.search);
const id = params.get('e');
const marcos = [];

function aplicar(destinos) {
  destinos = destinos.filter((d) => /^\/overlay-(?!escena)[\w-]+\.html(\?|$)/.test(d));
  destinos.forEach((d, i) => { // solo se recarga el marco cuya direccion cambio
    if (!marcos[i]) document.body.append(marcos[i] = document.createElement('iframe'));
    if (marcos[i].getAttribute('src') !== d) marcos[i].src = d;
  });
  while (marcos.length > destinos.length) marcos.pop().remove();
}

async function leer() {
  try {
    const respuesta = await fetch(`/api/overlays/escena?e=${encodeURIComponent(id)}`, { cache: 'no-store' });
    const datos = respuesta.ok ? await respuesta.json() : {};
    aplicar(datos.urls || []);
  } catch (_) { aplicar([]); }
}

async function actualizar() {
  if (id) return leer();
  const acceso = await leerAccesoOverlays();
  aplicar(acceso.pro ? params.getAll('l') : []);
}
actualizar();
setInterval(actualizar, 1000);
