import { almacenSesion } from '../../nucleo/estado/sesion.js';

/** Esta ventana no carga la sesion: sin el usuario, lo guardado por cuenta iria todo a `anonymous`. */
export async function identificarCuenta() {
  try {
    const respuesta = await fetch('/api/auth/session');
    if (respuesta.ok) almacenSesion.setState({ user: (await respuesta.json()).user || null });
  } catch { /* sin sesion disponible: se guarda como anonymous */ }
}
