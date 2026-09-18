const AVATAR_KEY = 'tikliveTTS_profileAvatar';
const TIPOS_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function obtenerAvatarPerfil() {
  try { return localStorage.getItem(AVATAR_KEY) || ''; } catch (_) { return ''; }
}

export async function guardarAvatarPerfil(file) {
  if (!file || !TIPOS_PERMITIDOS.has(file.type)) throw new Error('invalid-avatar');
  const url = URL.createObjectURL(file);
  try {
    const imagen = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const escala = Math.min(1, 128 / Math.max(imagen.naturalWidth, imagen.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
    canvas.getContext('2d').drawImage(imagen, 0, 0, canvas.width, canvas.height);
    const avatar = canvas.toDataURL('image/webp', 0.9);
    localStorage.setItem(AVATAR_KEY, avatar);
    return avatar;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function quitarAvatarPerfil() {
  try { localStorage.removeItem(AVATAR_KEY); } catch (_) { /* localStorage no disponible */ }
}
