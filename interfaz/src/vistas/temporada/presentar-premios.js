import { get, set } from '../../nucleo/estado/datos-por-cuenta.js';

const CLAVE = 'luckyDropPremiosPresentados';
const ESPERA_MS = 5000;

/**
 * La primera vez (por cuenta) que se ve Lucky Drop, el panel de premios sale desplegado y a los 5 s se recoge despacio,
 * para que se note donde esta la informacion. Si lo tocan antes, ya no se recoge solo.
 * @param {(abierto: boolean) => void} desplegar abre o pliega el panel
 */
export function presentarPremios(panel, lateral, desplegar) {
  const observador = new window.IntersectionObserver(([entrada]) => {
    if (!entrada.isIntersecting) return; // el panel existe desde el principio; cuenta cuando se ve
    observador.disconnect();
    if (get(CLAVE)) return;
    set(CLAVE, '1');
    desplegar(true);
    const espera = setTimeout(() => {
      lateral.classList.add('is-lento');
      desplegar(false);
    }, ESPERA_MS);
    lateral.addEventListener('click', () => {
      clearTimeout(espera);
      lateral.classList.remove('is-lento');
    }, { once: true });
  });
  observador.observe(panel);
  lateral.addEventListener('transitionend', (evento) => {
    if (evento.target === lateral) lateral.classList.remove('is-lento');
  });
}
