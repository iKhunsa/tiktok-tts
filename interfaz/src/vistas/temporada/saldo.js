// Saldo de monedas de la temporada, arriba a la derecha (menos en la pestana de inicio). Mientras no exista la economia
// real devuelve un valor de ejemplo; cuando exista solo cambia leerSaldo().
const SALDO_DE_EJEMPLO = 100;

export const leerSaldo = () => SALDO_DE_EJEMPLO;

/** El recuadro del saldo: moneda, cifra y un boton "+" para conseguir mas (todavia sin destino). */
export function crearSaldo() {
  const saldo = document.createElement('div');
  saldo.className = 'temporada-saldo';
  saldo.hidden = true;
  saldo.innerHTML = `<span class="temporada-moneda" aria-hidden="true"></span>
    <strong class="temporada-saldo-cifra" data-i18n-aria-label="temporada.saldo.titulo">${leerSaldo()}</strong>
    <button type="button" class="temporada-saldo-mas" data-i18n-aria-label="temporada.saldo.mas"></button>`;
  return saldo;
}
