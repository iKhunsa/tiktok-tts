const PRECARGA_MAX_MS = 1500;

/** Rechaza si `promesa` no resuelve a tiempo: un recurso lento no debe retrasar el evento. */
function conLimite(promesa, descripcion) {
  const limite = new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout de precarga: ${descripcion}`)), PRECARGA_MAX_MS));
  return Promise.race([promesa, limite]);
}

function precargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = () => reject(new Error(`no se pudo cargar ${src}`));
    img.src = src;
  });
}

function precargarAudio({ src, volumen }) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volumen;
    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror = () => reject(new Error(`no se pudo cargar ${src}`));
    audio.src = src;
  });
}

/** Las imagenes son obligatorias: si fallan el evento no se reproduce. */
export function precargarImagenes(recursos) {
  return conLimite(Promise.all(recursos.map(precargarImagen)), 'imagenes');
}

/** Los sonidos son opcionales: devuelve los que cargaron, sin rechazar nunca. */
export async function precargarSonidos(sonidos) {
  const cargados = await Promise.all(sonidos.map((s) => conLimite(precargarAudio(s), s.src).catch(() => null)));
  return cargados.filter(Boolean);
}
