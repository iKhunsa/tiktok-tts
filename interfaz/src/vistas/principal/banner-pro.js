import { almacenSesion } from '../../nucleo/estado/sesion.js';
import { get, set } from '../../nucleo/estado/datos-por-cuenta.js';
import { abrirPopupPlanes } from '../../componentes/popup-planes.js';

const CLAVE_CERRADO = 'proBannerCerrado';

// Solo para quien puede mejorar: plan Free con el sistema de cuentas activo.
// Sin Promos y Pro no lo ven. La X lo oculta para esa cuenta.
export function iniciarBannerPro() {
  const banner = document.getElementById('proBanner');
  if (!banner) return;
  const pintar = () => {
    const { activo, plan } = almacenSesion.getState();
    banner.hidden = !activo || plan !== 'free' || get(CLAVE_CERRADO) === '1';
  };
  banner.querySelector('#proBannerOpen').addEventListener('click', abrirPopupPlanes);
  banner.querySelector('#proBannerClose').addEventListener('click', () => {
    set(CLAVE_CERRADO, '1');
    pintar();
  });
  almacenSesion.subscribe(pintar);
  pintar();
}
