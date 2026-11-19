import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';

// Cliente de la biblioteca Media (imagenes que sube el usuario, por cuenta): la usan la pestana Media y los selectores.

export async function pedirMedia(metodo, cuerpo, ruta = '') {
  const respuesta = await fetch(`/api/imagenes${ruta}`, {
    method: metodo,
    headers: cuerpo && !(cuerpo instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo instanceof FormData || !cuerpo ? cuerpo : JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw Object.assign(new Error(datos.error || 'error'), { codigo: datos.codigo });
  return datos;
}

const CODIGOS = { muy_grande: 'mediaErrorTamano', formato_invalido: 'mediaErrorFormato', biblioteca_llena: 'mediaErrorLlena' };
export const avisarErrorMedia = (codigo) => showToast(t(`overlayCat.editor.${CODIGOS[codigo] || 'mediaError'}`), 'error');

export const listarMedia = async () => (await pedirMedia('GET')).items;

/** Sube las imagenes a la biblioteca y devuelve las guardadas; avisa del primer rechazo o de que se subieron. */
export async function subirMedia(archivos) {
  const formulario = new FormData();
  [...archivos].forEach((archivo) => formulario.append('imagenes', archivo));
  const { items, rechazos } = await pedirMedia('POST', formulario);
  if (rechazos.length) avisarErrorMedia(rechazos[0]);
  else showToast(t('overlayCat.editor.mediaSubido'), 'success');
  return items;
}
