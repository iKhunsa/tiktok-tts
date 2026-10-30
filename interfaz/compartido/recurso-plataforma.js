/**
 * Imagen y texto de un evento segun la plataforma que lo origino. Fuente unica para
 * overlays y alertas: asi ninguno muestra el recurso de otra plataforma.
 * TikTok no pasa por aqui: sus regalos ya traen imagen propia.
 */
const LOGOS = { twitch: 'icons/twitch-logo.svg', kick: 'icons/kick-logo.svg', youtube: 'icons/youtube-logo.svg' };
export const NIVELES_CHEER = [1, 100, 1000, 5000, 10000];

// CDN publico de Twitch, no documentado como contrato (la API exige token): por eso lleva reserva.
const urlCheermote = (bits) => {
  const nivel = NIVELES_CHEER.findLast((minimo) => bits >= minimo) || 1;
  return `https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/${nivel}/2.gif`;
};

// Regalos que existen en el CDN publico de Kick (comprobados uno a uno). Tampoco es contrato: lleva reserva.
export const NIVELES_KICKS = [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000];
const urlKicks = (cantidad) => {
  const nivel = NIVELES_KICKS.findLast((minimo) => cantidad >= minimo);
  return nivel ? `https://static.kick.com/kicks/gifts/${nivel}-kick.webp` : null;
};

export const logoPlataforma = (plataforma) => LOGOS[plataforma] || null;

/** { src, reserva } del evento, o null si debe conservar su icono propio. */
export function recursoDeEvento(evento) {
  const logo = logoPlataforma(evento.platform);
  if (evento.kind === 'cheer') return { src: urlCheermote(Number(evento.amount) || 0), reserva: LOGOS.twitch };
  const regaloKick = evento.kind === 'kicksgift' && urlKicks(Number(evento.amount) || 0);
  if (regaloKick) return { src: regaloKick, reserva: LOGOS.kick };
  if (evento.sticker) return { src: evento.sticker, reserva: logo };
  return logo ? { src: logo, reserva: null } : null;
}

/** Pone la imagen; si falla prueba la reserva y, sin ella, avisa con `alFallar`. */
export function cargarRecurso(imagen, { src, reserva }, alFallar = () => {}) {
  imagen.onerror = () => {
    imagen.onerror = alFallar;
    if (reserva) imagen.src = reserva;
    else alFallar();
  };
  imagen.src = src;
}

/** Twitch y Kick no tienen nombre de regalo: el texto sale de `kind`, traducido. */
export function etiquetaRegalo(t, { kind, amount, giftName }) {
  if (kind === 'cheer') return t('overlayStr.cheerBits', { bits: amount || 0 });
  if (kind === 'sub') return t('overlayStr.newSub');
  if (kind === 'kicksgift') return t('overlayStr.kicksGifted', { amount: amount || 0 });
  return giftName;
}
