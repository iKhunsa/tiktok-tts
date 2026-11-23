import { t } from '../../../nucleo/i18n/i18n.js';

/**
 * Acordeon de ajustes: boton con aria-expanded/aria-controls que muestra u oculta `cuerpo` (con `hidden`: los
 * campos siguen en el DOM, con sus valores y listeners). `reset` es el boton de restablecer, hermano del toggle
 * porque un boton no puede ir dentro de otro.
 */
export function crearAcordeon({ overlay, clave, tituloI18n, abierto, cuerpo, reset }) {
  const seccion = document.createElement('section');
  seccion.className = 'cfg-acordeon';
  seccion.dataset.acordeon = clave;

  const cabecera = document.createElement('div');
  cabecera.className = 'cfg-acordeon-cab';
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'cfg-acordeon-toggle';
  const titulo = document.createElement('span');
  titulo.dataset.i18n = tituloI18n;
  titulo.textContent = t(tituloI18n);
  boton.append(titulo);

  cuerpo.classList.add('cfg-acordeon-cuerpo');
  cuerpo.id = `acordeon-${overlay}-${clave}`;
  boton.setAttribute('aria-controls', cuerpo.id);
  const fijar = (estado) => {
    boton.setAttribute('aria-expanded', String(estado));
    cuerpo.hidden = !estado;
  };
  fijar(abierto);
  boton.addEventListener('click', () => fijar(boton.getAttribute('aria-expanded') !== 'true'));

  cabecera.append(boton, ...(reset ? [reset] : []));
  seccion.append(cabecera, cuerpo);
  return seccion;
}

/** Acordeones de `contenedor` (y sus internos) que estaban abiertos, por clave, para no cerrarlos al redibujar. */
export function estadoAcordeones(contenedor) {
  return new Map([...contenedor.querySelectorAll('.cfg-acordeon')].map((seccion) => [
    seccion.dataset.acordeon,
    seccion.querySelector(':scope > .cfg-acordeon-cab > .cfg-acordeon-toggle').getAttribute('aria-expanded') === 'true',
  ]));
}
