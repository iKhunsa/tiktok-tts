/** Valor tipado de un input de campo (numero -> number, bool -> boolean, resto -> string). */
export function leerValorDeEntrada(entrada, campo) {
  if (campo.tipo === 'bool') return entrada.checked;
  if (campo.tipo === 'numero') {
    const numero = parseFloat(entrada.value);
    if (!Number.isFinite(numero)) return campo.def;
    return campo.segundos ? Math.round(numero * 1000) : numero;
  }
  return entrada.value;
}
