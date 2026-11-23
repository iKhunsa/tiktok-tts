import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { crearAcordeon } from './acordeon.js';
import { crearBotonRestablecer } from './montar.js';

// Como era antes de los acordeones: el que sigue viendo el inspector del editor unificado.
function crearGeneralClasica(campos) {
  const seccion = document.createElement('details');
  seccion.className = 'cfg-grupo';
  seccion.dataset.grupo = 'general'; // el editor de canvas coloca despues su acordeon de GIF
  seccion.open = true;
  // El titulo va en un span: traducir el summary entero borraria el boton de restablecer.
  seccion.innerHTML = '<summary class="cfg-grupo-titulo"><span data-i18n="overlayCfg.grupo.general"></span></summary>';
  if (campos.dataset.camposBase) seccion.firstElementChild.append(crearBotonRestablecer(campos.dataset.camposBase, 'base'));
  seccion.append(campos);
  aplicarTraducciones(seccion);
  return seccion;
}

// General es la unica seccion de ajustes abierta desde el principio (junto a Apariencia, que monta campos-overlay): sin ella el panel se veria vacio.
function crearGeneralAcordeon(campos) {
  const overlay = campos.dataset.camposBase;
  const seccion = crearAcordeon({ overlay, clave: 'general', tituloI18n: 'overlayCfg.grupo.general', abierto: true, cuerpo: campos, reset: overlay && crearBotonRestablecer(overlay, 'general') });
  seccion.dataset.grupo = 'general'; // el editor de canvas coloca despues su acordeon de GIF
  return seccion;
}

/** Seccion General del inspector de un overlay, segun su disposicion: 'tarjeta' (acordeones) o 'clasico' (editor unificado). */
export const crearSeccionGeneral = (campos, disposicion) => (disposicion === 'clasico' ? crearGeneralClasica(campos) : crearGeneralAcordeon(campos));
