/** Catalogo curado de fuentes de Google Fonts disponibles en los overlays. */
export const FUENTE_SISTEMA = 'sistema';

export const FUENTES_DISPONIBLES = [
  FUENTE_SISTEMA, 'Exo 2', 'Inter', 'Poppins', 'Montserrat', 'Nunito', 'Roboto',
  'Bebas Neue', 'Orbitron', 'Bangers', 'Luckiest Guy', 'Pacifico', 'Press Start 2P',
];

export const EFECTOS_TEXTO = ['ninguno', 'sombra', 'contorno', 'neon'];

const PILA_SISTEMA = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const URL_GOOGLE_FONTS = 'https://fonts.googleapis.com/css2';

/** Valor de `font-family` para la fuente elegida (con respaldo si el CDN no responde). */
export function familiaCss(fuente) {
  return fuente === FUENTE_SISTEMA ? PILA_SISTEMA : `"${fuente}", ${PILA_SISTEMA}`;
}

/**
 * Unico punto que habla con Google Fonts: agrega el <link> de la fuente
 * elegida. Sin red el link falla en silencio y familiaCss() ya trae el
 * respaldo, asi que el overlay nunca queda sin texto.
 */
export function cargarFuente(fuente) {
  if (fuente === FUENTE_SISTEMA) return;
  const enlace = document.createElement('link');
  enlace.rel = 'stylesheet';
  enlace.href = `${URL_GOOGLE_FONTS}?family=${encodeURIComponent(fuente)}:wght@400;700&display=swap`;
  document.head.appendChild(enlace);
}
