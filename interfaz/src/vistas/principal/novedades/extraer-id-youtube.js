const ID_VALIDO = /^[\w-]{11}$/;

/**
 * URL de YouTube (watch?v=, youtu.be/ o /embed/) → id del video, o null si no
 * es un enlace de YouTube con un id válido.
 */
export function extraerIdYoutube(url) {
  let direccion;
  try { direccion = new URL(url); } catch (_) { return null; }
  const host = direccion.hostname.replace(/^www\./, '');
  let id = null;
  if (host === 'youtu.be') id = direccion.pathname.slice(1);
  else if (host === 'youtube.com') id = direccion.searchParams.get('v') || direccion.pathname.replace(/^\/embed\//, '');
  return ID_VALIDO.test(id || '') ? id : null;
}
