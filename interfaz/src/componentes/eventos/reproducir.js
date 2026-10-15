import { prefiereMovimientoReducido } from './movimiento-reducido.js';
import { logStorage } from '../../nucleo/log-storage.js';
import { obtenerAnclas } from './anclas.js';
import { precargarImagenes, precargarSonidos } from './precarga.js';
import { reproducirSonidos, detenerSonidos } from './sonidos.js';

let enCurso = false;
let generacion = 0; // detener() la incrementa: invalida una reproduccion que sigue precargando
let montado = null; // { capa, audios, limpiar, temporizador } mientras el evento esta en pantalla

// Cubre toda la ventana, debajo de la barra de titulo (z 1500) y de modales/toasts; no captura clics.
function crearCapa() {
  const capa = document.createElement('div');
  capa.className = 'evento-capa';
  capa.setAttribute('aria-hidden', 'true');
  capa.style.cssText = 'position:fixed;inset:0;overflow:hidden;z-index:1400;pointer-events:none;';
  return capa;
}

function desmontar() {
  if (!montado) return;
  const { capa, audios, limpiar, temporizador } = montado;
  clearTimeout(temporizador);
  detenerSonidos(audios);
  limpiar?.();
  capa.remove();
  montado = null;
  enCurso = false;
}

/** Corta de inmediato el evento en pantalla (capa, estilos y sonidos) y cancela uno que aun este cargando. */
export function detener() {
  generacion += 1;
  desmontar();
  enCurso = false;
}

/** Reproduce un evento una vez; ignora si ya hay uno en curso o hay movimiento reducido. */
export async function reproducir(evento) {
  if (enCurso || prefiereMovimientoReducido()) return false;
  enCurso = true;
  const miGeneracion = generacion;
  try {
    await precargarImagenes(evento.recursos || []);
  } catch (err) {
    enCurso = false;
    logStorage.addLog('warn', 'client', `evento ${evento.id} omitido: ${err.message}`);
    return false;
  }
  const audios = await precargarSonidos(evento.sonidos || []);
  if (miGeneracion !== generacion) return false; // se llamo a detener() mientras cargaba
  const capa = crearCapa();
  const limpiar = evento.montar(capa, obtenerAnclas());
  document.body.appendChild(capa);
  reproducirSonidos(audios);
  montado = { capa, audios, limpiar, temporizador: setTimeout(desmontar, evento.duracionMs) };
  return true;
}
