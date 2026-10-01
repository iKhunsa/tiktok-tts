/**
 * Efectos de texto compartidos por el chat y los rankings (ver estilo-texto.css).
 * `efecto` es uno de EFECTOS_TEXTO; la ola reparte cada letra en su <span>
 * con un retardo escalonado para que la onda recorra el nombre.
 */
export function estilizarTexto(elemento, { efecto, ola = false, resplandor = false }) {
  if (efecto !== 'ninguno') elemento.classList.add(`fx-${efecto}`);
  if (resplandor) elemento.classList.add('resplandor');
  if (ola) envolverLetras(elemento);
}

function envolverLetras(elemento) {
  const letras = [...elemento.textContent];
  elemento.textContent = '';
  elemento.classList.add('ola');
  letras.forEach((letra, indice) => {
    const span = document.createElement('span');
    span.textContent = letra === ' ' ? ' ' : letra;
    span.style.setProperty('--i', indice);
    elemento.appendChild(span);
  });
}
