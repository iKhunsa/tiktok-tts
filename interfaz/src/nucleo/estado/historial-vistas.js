/**
 * Historial de secciones visitadas (atrás/adelante de la barra de título).
 * Puro: no toca el DOM, el router lo alimenta y la barra lo lee.
 */
export function crearHistorialVistas() {
  const pila = [];
  let indice = -1;
  const oyentes = new Set();
  const avisar = () => oyentes.forEach((fn) => fn());

  function moverA(nuevoIndice) {
    if (nuevoIndice < 0 || nuevoIndice >= pila.length) return null;
    indice = nuevoIndice;
    avisar();
    return pila[indice];
  }

  return {
    registrar(nombre) {
      if (pila[indice] === nombre) return;
      pila.length = indice + 1; // visitar algo nuevo descarta el "adelante"
      pila.push(nombre);
      indice += 1;
      avisar();
    },
    retroceder: () => moverA(indice - 1),
    avanzar: () => moverA(indice + 1),
    puedeRetroceder: () => indice > 0,
    puedeAvanzar: () => indice < pila.length - 1,
    suscribir(fn) { oyentes.add(fn); },
  };
}
