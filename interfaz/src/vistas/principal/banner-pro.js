import { almacenSesion } from '../../nucleo/estado/sesion.js';
import { abrirPopupPlanes } from '../../componentes/popup-planes.js';

// Solo para quien puede mejorar: plan Free con el sistema de cuentas activo.
// Sin Promos y Pro no lo ven. La X lo oculta solo mientras la app sigue abierta:
// no se persiste, así que vuelve a verse en cada apertura.
export function iniciarBannerPro() {
  const banner = document.getElementById('proBanner');
  if (!banner) return;
  let cerrado = false;
  const pintar = () => {
    const { activo, plan } = almacenSesion.getState();
    banner.hidden = !activo || plan !== 'free' || cerrado;
  };
  banner.querySelector('#proBannerOpen').addEventListener('click', abrirPopupPlanes);
  banner.querySelector('#proBannerClose').addEventListener('click', () => {
    cerrado = true;
    pintar();
  });
  almacenSesion.subscribe(pintar);
  pintar();
}
