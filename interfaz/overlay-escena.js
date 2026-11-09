// Una escena del editor de canvas en una sola Browser Source: cada ?l= es la direccion (relativa) de un overlay,
// de abajo hacia arriba. Solo se aceptan paginas overlay de este mismo origen.
for (const destino of new URLSearchParams(location.search).getAll('l')) {
  if (!/^\/overlay-[\w-]+\.html(\?|$)/.test(destino)) continue;
  const marco = document.createElement('iframe');
  marco.src = destino;
  document.body.append(marco);
}
