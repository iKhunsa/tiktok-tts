const turnos = new Map();

/**
 * SOLO PARA REVISAR: sin azar ni probabilidades, cada llamada da el siguiente premio de la lista y al final vuelve a
 * empezar. Misma firma que `sortearPremio`, que es el que debe quedar antes de publicar.
 */
export async function premioEnOrden(premios) {
  const turno = turnos.get(premios) ?? 0;
  turnos.set(premios, turno + 1);
  return premios[turno % premios.length].id;
}
