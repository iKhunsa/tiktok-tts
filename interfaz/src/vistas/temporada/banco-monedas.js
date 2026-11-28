import { aplicarTraducciones, t } from '../../nucleo/i18n/i18n.js';
import { abonarMonedas, leerSaldo } from './saldo.js';
import { procesarCompra } from './procesar-compra.js';

// Paquetes de monedas (datos de ejemplo hasta tener los reales). `forma` decide su lugar en la grilla: dos chicos arriba,
// uno ancho debajo y el grande, alto, a la derecha.
const PAQUETES = [
  { id: 'chico', monedas: 850, usd: 3, forma: 'chico-1', arte: 'monedas-850.webp' },
  { id: 'mediano', monedas: 1250, usd: 4, forma: 'chico-2', arte: 'monedas-1250.webp' },
  { id: 'grande', monedas: 1550, usd: 5, forma: 'ancho', arte: 'monedas-1550.webp' },
  { id: 'cofre', monedas: 1950, usd: 6, forma: 'alto', arte: 'cofre-monedas.webp' },
];
const RUTA_ARTE = 'img/eventos/winter';
const SALIDA_MS = 180;
// Lo que queda detras mientras el banco esta abierto: sin foco ni lectura de pantalla.
const DETRAS = ['.temporada-barra', '.temporada-paneles', '.temporada-saldo', '#temporadaSiguiente'];

let abierto = null;

export const bancoAbierto = () => !!abierto;

/** Cierra el banco de monedas (Esc, la flecha de volver o un clic fuera de la tarjeta). */
export function cerrarBancoMonedas() {
  abierto?.cerrar();
}

/** Avisa de la compra, la procesa y, si se paga, las monedas vuelan desde el paquete hasta el saldo. */
async function comprar(overlay, boton) {
  const { id, monedas, usd } = PAQUETES.find((candidato) => candidato.id === boton.dataset.paquete);
  window.dispatchEvent(new window.CustomEvent('temporada:comprar-monedas', { detail: { id, monedas, usd } }));
  const precio = boton.querySelector('.temporada-paquete-precio');
  const textoPrecio = precio.textContent;
  boton.disabled = true; // sin compras dobles mientras se procesa
  precio.textContent = t('temporada.banco.procesando');
  const pagado = await procesarCompra({ id, monedas, usd }).finally(() => {
    boton.disabled = false;
    precio.textContent = textoPrecio;
  });
  if (!pagado) return;
  const cerrado = overlay.classList.contains('is-saliendo');
  abonarMonedas(monedas, boton.querySelector('img'), cerrado ? undefined : overlay.querySelector('.temporada-banco-saldo'));
}

/**
 * "Coin Bank": ventana emergente encima de la ventana de la temporada con los paquetes de monedas. Elegir un paquete avisa
 * con el evento `temporada:comprar-monedas` ({ detail: { id, monedas, usd } }); el pago esta simulado (procesar-compra.js).
 */
export function abrirBancoMonedas() {
  if (abierto) return;
  const origen = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'temporada-modal';
  overlay.innerHTML = `
    <div class="temporada-banco" role="dialog" aria-modal="true" aria-labelledby="temporadaBancoTitulo">
      <header class="temporada-banco-cabecera">
        <button type="button" class="temporada-banco-volver" data-volver data-i18n-aria-label="temporada.banco.volver"></button>
        <h2 id="temporadaBancoTitulo" data-i18n="temporada.banco.titulo"></h2>
        <div class="temporada-banco-saldo"><span class="temporada-moneda" aria-hidden="true"></span><strong data-cifra>${leerSaldo()}</strong></div>
      </header>
      <div class="temporada-paquetes">
        ${PAQUETES.map(({ id, monedas, usd, forma, arte }) => `
          <button type="button" class="temporada-paquete temporada-paquete-${forma}" data-paquete="${id}">
            <strong class="temporada-paquete-cantidad">x${monedas}</strong>
            <span class="temporada-paquete-arte"><img src="${RUTA_ARTE}/${arte}" alt=""></span>
            <span class="temporada-paquete-precio">${usd} USD</span>
          </button>`).join('')}
      </div>
    </div>`;
  document.body.append(overlay);
  aplicarTraducciones(overlay);
  DETRAS.forEach((selector) => { const el = document.querySelector(selector); if (el) el.inert = true; });

  const cerrar = () => {
    abierto = null;
    DETRAS.forEach((selector) => { const el = document.querySelector(selector); if (el) el.inert = false; });
    overlay.classList.add('is-saliendo');
    setTimeout(() => overlay.remove(), SALIDA_MS);
    origen?.focus?.({ preventScroll: true });
  };
  abierto = { cerrar };

  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay || evento.target.closest('[data-volver]')) { cerrar(); return; }
    const paquete = evento.target.closest('[data-paquete]');
    if (paquete) comprar(overlay, paquete);
  });
  const dialogo = overlay.querySelector('.temporada-banco');
  dialogo.tabIndex = -1; // el foco entra al dialogo sin marcar ningun boton: Tab llega primero a "volver"
  dialogo.focus({ preventScroll: true });
}
