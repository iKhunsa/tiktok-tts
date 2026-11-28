/**
 * La barra espaciadora pulsa `boton` mientras `panel` esta a la vista. Respeta el teclado: sobre cualquier otro control
 * la tecla sigue siendo suya (menos la pestana ya elegida, donde no haria nada) y con una ventana emergente no actua.
 */
export function activarConEspacio(panel, boton) {
  document.addEventListener('keydown', (evento) => {
    if (evento.code !== 'Space' || evento.ctrlKey || evento.altKey || evento.metaKey) return;
    if (panel.hidden || panel.closest('[inert]') || document.querySelector('dialog[open]')) return;
    const control = evento.target.closest?.('button, input, select, textarea, a');
    if (control && !control.matches('.temporada-pestana[aria-selected="true"]')) return;
    evento.preventDefault();
    if (!evento.repeat) boton.click(); // dejarla pulsada no encadena giros
  });
}
