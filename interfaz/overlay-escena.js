// Una escena del editor de canvas en una sola Browser Source. ?e=<id> es estatico: las capas (direcciones relativas de
// overlays, de abajo hacia arriba) se leen del respaldo de ajustes y se revisan cada segundo, asi mover una capa en el
// editor se ve en OBS sin recargar. ?l= (enlaces antiguos) lista las capas directamente.
// Solo se aceptan paginas overlay de este mismo origen.
const params = new URLSearchParams(location.search);
const id = params.get('e');
const marcos = [];

function aplicar(destinos) {
  destinos = destinos.filter((d) => /^\/overlay-[\w-]+\.html(\?|$)/.test(d));
  destinos.forEach((d, i) => { // solo se recarga el marco cuya direccion cambio
    if (!marcos[i]) document.body.append(marcos[i] = document.createElement('iframe'));
    if (marcos[i].getAttribute('src') !== d) marcos[i].src = d;
  });
  while (marcos.length > destinos.length) marcos.pop().remove();
}

async function leer() {
  try {
    const { datos } = await (await fetch('/api/ajustes-ui')).json();
    aplicar(datos?.escenas?.find((e) => e.id === id)?.urls ?? []);
  } catch (_) { /* sin servidor se conserva lo que hay */ }
}

if (id) { leer(); setInterval(leer, 1000); } else aplicar(params.getAll('l'));
