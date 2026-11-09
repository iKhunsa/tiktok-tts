import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';

// Deshacer / rehacer del editor de canvas: instantaneas de lo que el editor toca en appSettings.
// Los cambios seguidos (arrastres, sliders) se agrupan en un solo paso.
const CLAVES = ['overlays', 'escenas', 'overlayLienzo', 'epik'];
const MAX_PASOS = 100;
const AGRUPAR_MS = 500;

let pasado = [];
let futuro = [];
let actual = null;
let agrupando = 0;
let aplicando = false;

const instantanea = () => JSON.stringify(Object.fromEntries(CLAVES.map((clave) => [clave, appSettings[clave]])));

export function reiniciarHistorial() {
  pasado = [];
  futuro = [];
  actual = instantanea();
  clearTimeout(agrupando);
  agrupando = 0;
}

/** Llamar tras cada cambio de ajustes (saveSettings): apunta un paso si algo cambio. */
export function registrarCambio() {
  if (aplicando || actual === null) return;
  const nueva = instantanea();
  if (nueva === actual) return;
  if (!agrupando) pasado = [...pasado.slice(-(MAX_PASOS - 1)), actual];
  futuro = [];
  actual = nueva;
  clearTimeout(agrupando);
  agrupando = setTimeout(() => { agrupando = 0; }, AGRUPAR_MS);
}

function viajar(origen, destino, refrescar) {
  if (!origen.length) return;
  clearTimeout(agrupando);
  agrupando = 0;
  destino.push(actual);
  actual = origen.pop();
  aplicando = true;
  try {
    Object.assign(appSettings, JSON.parse(actual));
    refrescar();
    saveSettings();
  } finally {
    aplicando = false;
  }
}

export const deshacer = (refrescar) => viajar(pasado, futuro, refrescar);
export const rehacer = (refrescar) => viajar(futuro, pasado, refrescar);
