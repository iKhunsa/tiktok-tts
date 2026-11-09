import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';

// Piezas que comparten las secciones "Buscador de GIF" y "Efectos de sonido" del editor de canvas.

/** Barra de pestañas: una por vista, con el contador de la biblioteca. `claves` traduce cada una. */
export function crearSubnav(vistas, claves, alElegir) {
  const nav = document.createElement('nav');
  nav.className = 'gif-subnav';
  const botones = Object.fromEntries(vistas.map((clave) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gif-subpestana';
    b.innerHTML = `<span data-i18n="${claves[clave]}"></span>`;
    if (clave === 'biblioteca') b.insertAdjacentHTML('beforeend', ' <span class="gif-subpestana-cuenta"></span>');
    b.addEventListener('click', () => alElegir(clave));
    nav.append(b);
    return [clave, b];
  }));
  return { nav, botones };
}

/**
 * Boton a la derecha de las pestañas que sube archivos propios a la biblioteca. `subir` es la llamada de su
 * API, `accept` los formatos que ofrece el selector y `claves` los textos ({ boton, subido, duplicado, errorFormato? }).
 */
export function crearSubir({ subir, accept, claves, alSubir }) {
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.multiple = true;
  entrada.hidden = true;
  entrada.accept = accept;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'gif-boton-principal gif-subir';
  boton.innerHTML = `<img class="icon-inline" src="icons/add.svg" alt=""> <span data-i18n="${claves.boton}"></span>`;
  boton.addEventListener('click', () => entrada.click());
  entrada.addEventListener('change', async () => {
    const archivos = [...entrada.files];
    entrada.value = '';
    if (!archivos.length) return;
    boton.disabled = true;
    try {
      const { items, rechazos, duplicados } = await subir(archivos);
      if (items.length) showToast(t(claves.subido, { n: items.length }), 'success');
      else if (duplicados && !rechazos.length) showToast(t(claves.duplicado), 'success');
      if (rechazos.length) showToast(t(rechazos[0] === 'formato_incompatible' && claves.errorFormato ? claves.errorFormato : `gifs.error.${rechazos[0]}`), 'error');
      alSubir();
    } catch (error) {
      showToast(t(`gifs.error.${error.codigo}`), 'error');
    } finally {
      boton.disabled = false;
    }
  });
  return [boton, entrada];
}
