/**
 * Subida directa a Cloudinary para avatar/banner de cuenta (ver
 * docs/plan-avatar-banner.md). El backend solo firma; el archivo viaja
 * DIRECTO de esta app a Cloudinary, nunca pasa por nuestro server. La usa la
 * seccion Perfil del modal "Mi cuenta".
 */
import { pedir } from './api.js';

const LIMITES_BYTES = { avatar: 5 * 1024 * 1024, banner: 10 * 1024 * 1024 };
const FORMATOS_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp']);

// Unica validacion real de tamaño: Cloudinary no tiene forma de forzarla con
// subida directa (ver "Limitacion real de Cloudinary" en el plan).
export function validarImagenDeCuenta(tipo, file) {
  if (!file) return { ok: false, motivo: 'formato' };
  if (!FORMATOS_PERMITIDOS.has(file.type)) return { ok: false, motivo: 'formato' };
  if (file.size > LIMITES_BYTES[tipo]) return { ok: false, motivo: 'tamano' };
  return { ok: true };
}

async function subirACloudinary(firma, file) {
  const form = new FormData();
  form.append('file', file);
  form.append('public_id', firma.publicId);
  form.append('timestamp', firma.timestamp);
  form.append('api_key', firma.apiKey);
  form.append('signature', firma.signature);
  form.append('overwrite', String(firma.overwrite));
  form.append('allowed_formats', firma.allowedFormats);

  let r;
  try {
    r = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`, { method: 'POST', body: form });
  } catch (_) {
    return { ok: false, status: 0, body: null };
  }
  let body = null;
  try { body = await r.json(); } catch (_) { /* sin cuerpo */ }
  return { ok: r.ok, status: r.status, body };
}

/**
 * Orquesta todo el flujo: pide la firma a nuestro backend, sube directo a
 * Cloudinary y avisa que termino. tipo: 'avatar' | 'banner'.
 * Devuelve {ok:true, sesion} (la sesion re-hidratada por "confirmar", con el
 * user.avatarUrl/bannerUrl nuevo, lista para aplicarSesion) o
 * {ok:false, motivo: 'formato'|'tamano'|'firma'|'cloudinary'|'confirmar', body?}.
 */
export async function subirImagenDeCuenta(tipo, file) {
  const validacion = validarImagenDeCuenta(tipo, file);
  if (!validacion.ok) return validacion;

  const rFirma = await pedir(`/api/account/${tipo}/firma`, { method: 'POST' });
  if (!rFirma.ok) return { ok: false, motivo: 'firma', body: rFirma.body };

  const rCloudinary = await subirACloudinary(rFirma.body, file);
  if (!rCloudinary.ok) return { ok: false, motivo: 'cloudinary', body: rCloudinary.body };

  const rConfirmar = await pedir(`/api/account/${tipo}/confirmar`, { method: 'POST' });
  if (!rConfirmar.ok) return { ok: false, motivo: 'confirmar', body: rConfirmar.body };

  return { ok: true, sesion: rConfirmar.body };
}
