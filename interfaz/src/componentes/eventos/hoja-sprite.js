/**
 * Animacion de spritesheets en CSS puro: la hoja entera es el background de un
 * div del tamano de UN frame y un @keyframes con steps(1) salta de celda en
 * celda (sin interpolar). Compartido por todos los eventos con sprites.
 */

/** @returns {string} @keyframes que recorre las celdas de la hoja en `orden`. */
export function generarKeyframes(nombre, { cols, rows, frames, orden }) {
  const secuencia = orden || Array.from({ length: frames }, (_, i) => i);
  const posicion = (celda) => {
    const x = cols > 1 ? ((celda % cols) / (cols - 1)) * 100 : 0;
    const y = rows > 1 ? (Math.floor(celda / cols) / (rows - 1)) * 100 : 0;
    return `${x}% ${y}%`;
  };
  const pasos = secuencia.map((celda, i) => `${(i / secuencia.length) * 100}% { background-position: ${posicion(celda)}; }`);
  return `@keyframes ${nombre}-frames { ${pasos.join(' ')} }`;
}

/**
 * Declara una hoja: devuelve la clase CSS y el CSS que el evento debe inyectar.
 * `aspecto` = ancho/alto de una celda (1 si es cuadrada). */
export function definirHoja({ nombre, src, cols, rows, frames, fps, orden, aspecto = 1 }) {
  const duracion = (orden ? orden.length : frames) / fps;
  const css = `${generarKeyframes(nombre, { cols, rows, frames, orden })}
    .${nombre} { background-image: url("${src}"); background-size: ${cols * 100}% ${rows * 100}%;
      image-rendering: pixelated; aspect-ratio: ${aspecto};
      animation: ${nombre}-frames ${duracion}s steps(1, end) infinite; }`;
  return { clase: nombre, css };
}

export function crearSprite(hoja, ancho) {
  const el = document.createElement('div');
  el.className = hoja.clase;
  el.style.width = `${ancho}px`;
  return el;
}
