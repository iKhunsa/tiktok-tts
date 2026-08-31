/**
 * Cola de alertas con auto-dismiss, compartida por overlay-alertas.html
 * (regalos/subs/cheers/raids) y overlay-alertas-social.html (follow/share).
 * Antes cada uno tenia su propia copia de enqueue/processQueue/dismiss.
 *
 * @param {(evento: any) => void} mostrar - crea y anima la tarjeta de un evento
 */
export function crearColaAlertas(mostrar) {
  const cola = [];
  let mostrando = false;

  function procesar() {
    if (!cola.length) { mostrando = false; return; }
    mostrando = true;
    mostrar(cola.shift(), procesar);
  }

  function encolar(evento) {
    cola.push(evento);
    if (!mostrando) procesar();
  }

  return { encolar };
}

/** Programa el retiro de una tarjeta tras `dur` ms, con red de seguridad
 * si animationend nunca dispara. Comun a ambos overlays de alertas. */
export function programarRetiro(card, dur, alTerminar) {
  setTimeout(() => {
    card.classList.add('leaving');
    card.addEventListener('animationend', () => { card.remove(); alTerminar(); }, { once: true });
  }, dur);
  setTimeout(() => { if (card.parentNode) { card.remove(); alTerminar(); } }, dur + 1500);
}

export const PLATFORM_META = {
  tiktok: { label: 'TIKTOK', color: '#ff0050' },
  twitch: { label: 'TWITCH', color: '#9146FF' },
  youtube: { label: 'YOUTUBE', color: '#FF0000' },
};
