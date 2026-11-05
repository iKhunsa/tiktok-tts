import { avatarGenerado } from './avatar-generado.js';

/**
 * Foto de perfil de quien dispara la alerta, con el icono del evento (regalo, Bits,
 * seguidor...) en la esquina, como el avatar del chat con su plataforma. Estilos en
 * foto-con-icono.css. Sin foto, o si la de TikTok caduco, usa el avatar generado.
 */
export function crearFotoConIcono({ user, avatar }, icono) {
  const foto = document.createElement('span');
  foto.className = 'foto-icono';
  const imagen = document.createElement('img');
  imagen.className = 'foto-icono-avatar';
  imagen.alt = '';
  const generado = avatarGenerado(user);
  imagen.src = avatar || generado;
  imagen.addEventListener('error', () => { imagen.src = generado; }, { once: true });
  foto.append(imagen, icono);
  return foto;
}
