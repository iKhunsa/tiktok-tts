import { animarGanancia, animarGasto } from './animar-ganancia.js';

// Saldo de monedas de la temporada, arriba a la derecha (menos en la pestana de inicio). Mientras no exista la economia
// real parte de un valor de ejemplo y lo ganado vive solo mientras la ventana esta abierta.
let monedas = 100;

export const leerSaldo = () => monedas;

/**
 * Suma `cantidad` al saldo y lo muestra con monedas que vuelan desde `origen` hasta `destino`: el recuadro de arriba, o
 * el del banco mientras esta abierto (el de arriba se pone al dia sin animarse, porque queda tapado).
 */
export function abonarMonedas(cantidad, origen, destino) {
  monedas += cantidad;
  const principal = document.querySelector('.temporada-saldo');
  if (destino) {
    const cifra = principal.querySelector('[data-cifra]');
    cifra.textContent = Number(cifra.textContent) + cantidad;
  }
  animarGanancia(destino ?? principal, cantidad, origen);
}

/** Descuenta `cantidad` si alcanza; si no, devuelve false sin tocar nada. */
export function gastarMonedas(cantidad) {
  if (monedas < cantidad) return false;
  monedas -= cantidad;
  animarGasto(document.querySelector('.temporada-saldo'), cantidad);
  return true;
}

/** El recuadro del saldo: moneda, cifra y un boton "+". Todo el recuadro lleva al banco de monedas. */
export function crearSaldo() {
  const saldo = document.createElement('div');
  saldo.className = 'temporada-saldo';
  saldo.hidden = true;
  saldo.innerHTML = `<span class="temporada-moneda" aria-hidden="true"></span>
    <strong class="temporada-saldo-cifra" data-cifra data-i18n-aria-label="temporada.saldo.titulo">${leerSaldo()}</strong>
    <button type="button" class="temporada-saldo-mas" data-i18n-aria-label="temporada.saldo.mas"></button>`;
  return saldo;
}
