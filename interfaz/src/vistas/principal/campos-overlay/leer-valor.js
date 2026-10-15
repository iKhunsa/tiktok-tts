/** Valor tipado de un input de campo (numero -> number, bool -> boolean, resto -> string). */
export function leerValorDeEntrada(entrada, campo) {
  if (campo.tipo === 'bool') return entrada.checked;
  if (campo.tipo === 'numero') {
    const numero = parseFloat(entrada.value);
    return Number.isFinite(numero) ? numero : campo.def;
  }
  return entrada.value;
}
