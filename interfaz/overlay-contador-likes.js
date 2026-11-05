import { cargarLocaleOverlay, aplicarI18nOverlay, idiomaOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { iniciarFuenteContador } from './compartido/fuente-contador.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';
import { elegirEntrada } from './compartido/epik/anfitrion.js';

function nativo() {
  iniciarOverlayFijo('contador-likes', 360, 110);
  registrarErroresOverlay();

  const params = leerParametros();
  const vistaPrevia = esVistaPrevia(params);
  aplicarParametrosVisuales(params);

  const RUTA_CORAZON = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
  const MAX_FLOTANTES = 8; // en una lluvia de likes no se acumulan corazones sin fin
  const CUENTA_MS = 600;
  const COMPACTO_DESDE = 100000; // 1.234.567 no cabe: pasa a 1,2 M

  const tarjeta = document.getElementById('tarjeta');
  const corazon = document.getElementById('corazon');
  const contador = document.getElementById('count');
  const suma = document.getElementById('suma');

  let total = 0;
  let mostrado = 0;
  let animacion = null;

  function formatear(valor) {
    const opciones = valor >= COMPACTO_DESDE ? { notation: 'compact', maximumFractionDigits: 1 } : {};
    return new Intl.NumberFormat(idiomaOverlay(), opciones).format(valor);
  }

  // Una sola animacion de conteo: si llegan likes mientras cuenta, sigue desde donde va.
  function contarHasta(destino) {
    cancelAnimationFrame(animacion);
    const desde = mostrado;
    const inicio = performance.now();
    const paso = (ahora) => {
      const progreso = Math.min((ahora - inicio) / CUENTA_MS, 1);
      mostrado = Math.round(desde + (destino - desde) * (1 - (1 - progreso) ** 3));
      contador.textContent = formatear(mostrado);
      if (progreso < 1) animacion = requestAnimationFrame(paso);
    };
    animacion = requestAnimationFrame(paso);
  }

  function reiniciarAnimacion(elemento, clase) {
    elemento.classList.remove(clase);
    void elemento.offsetWidth;
    elemento.classList.add(clase);
  }

  function soltarCorazones(cantidad) {
    const libres = MAX_FLOTANTES - tarjeta.querySelectorAll('.flotante').length;
    for (let i = 0; i < Math.min(cantidad, libres); i += 1) {
      const flotante = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      flotante.setAttribute('viewBox', '0 0 24 24');
      flotante.classList.add('flotante');
      flotante.innerHTML = `<path d="${RUTA_CORAZON}"/>`;
      flotante.style.setProperty('--x', `${Math.round(Math.random() * 60 - 30)}px`);
      flotante.style.setProperty('--giro', `${Math.round(Math.random() * 50 - 25)}deg`);
      flotante.style.animationDelay = `${i * 90}ms`;
      flotante.addEventListener('animationend', () => flotante.remove(), { once: true });
      tarjeta.append(flotante);
    }
  }

  function sumarLikesNuevos(cantidad) {
    contarHasta(total);
    suma.textContent = `+${formatear(cantidad)}`;
    reiniciarAnimacion(suma, 'visible');
    reiniciarAnimacion(corazon, 'late');
    soltarCorazones(Math.min(4, Math.ceil(Math.log10(cantidad + 1))));
  }

  function reiniciar() {
    mostrado = total;
    contador.textContent = formatear(total);
  }

  const aplicarA11y = iniciarAccesibilidadOverlay();
  iniciarFuenteContador('contador-likes', {
    vistaPrevia,
    alCambio: ({ valor, suma: cantidad }) => {
      total = valor;
      if (cantidad) sumarLikesNuevos(cantidad);
      else reiniciar();
    },
    alConfig: aplicarA11y,
  });
  cargarLocaleOverlay().then(() => aplicarI18nOverlay());
}

elegirEntrada({ nativo, epik: () => import('./compartido/epik/anfitrion-contador.js').then((m) => m.iniciar('contador-likes', nativo)) });
