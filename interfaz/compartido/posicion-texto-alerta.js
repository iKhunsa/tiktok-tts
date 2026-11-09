/**
 * Posicion del texto de una alerta respecto a su imagen (icono, foto de perfil o GIF): al lado (lo de siempre) o
 * debajo, con todo centrado. Se aplica a la tarjeta ya montada, antes de ponerla en pantalla.
 */
export function aplicarPosicionTexto(tarjeta, cfg) {
  if (cfg?.posicionTexto !== 'debajo') return;
  Object.assign(tarjeta.style, { flexDirection: 'column', textAlign: 'center', justifyContent: 'center' });
  for (const hijo of tarjeta.children) Object.assign(hijo.style, { alignSelf: 'center', marginLeft: '0', marginRight: '0' });
}
