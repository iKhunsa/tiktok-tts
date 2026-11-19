/**
 * Nombre de la tecla de un atajo al capturarlo: la tecla fisica, no el caracter que produce. Con Shift, `evento.key`
 * de la tecla 1 es "!" (y "@" la 2): el atajo quedaria como "Shift+!" y los atajos globales lo rechazan.
 */
export function teclaDeAtajo(evento) {
  const digito = /^(?:Digit|Numpad)(\d)$/.exec(evento.code ?? '');
  if (digito) return digito[1];
  const letra = /^Key([A-Z])$/.exec(evento.code ?? '');
  if (letra) return letra[1];
  return evento.key.toUpperCase();
}
