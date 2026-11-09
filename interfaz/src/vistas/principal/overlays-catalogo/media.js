import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { idCapaGif } from './gif-capas.js';
import { botonEliminar, botonIcono, elemento } from '../gif-buscador/biblioteca.js';

// Pestana Media del editor de canvas: biblioteca de imagenes que sube el usuario (PNG, JPEG, WebP, GIF), por cuenta.
// Los textos que vienen del servidor (nombres) entran con textContent, nunca como HTML.

async function pedir(metodo, cuerpo, ruta = '') {
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
const avisarError = (codigo) => showToast(t(`overlayCat.editor.${CODIGOS[codigo] || 'mediaError'}`), 'error');

export function crearMedia() {
  const raiz = elemento('div', 'edi-media');
  const herramientas = elemento('div', 'gif-herramientas');
  const entrada = elemento('input');
  entrada.type = 'file';
  entrada.multiple = true;
  entrada.accept = 'image/png,image/jpeg,image/webp,image/gif';
  entrada.hidden = true;
  const subir = elemento('button', 'gif-boton-principal');
  subir.type = 'button';
  subir.innerHTML = '<img class="icon-inline" src="icons/add.svg" alt=""> <span data-i18n="overlayCat.editor.mediaSubir"></span>';
  subir.addEventListener('click', () => entrada.click());
  const contador = elemento('span', 'gif-contador');
  herramientas.append(subir, contador, entrada);
  const rejilla = elemento('div', 'gif-rejilla');
  raiz.append(herramientas, rejilla);

  let items = [];
  let llevarAlCanvas = null; // lo entrega el editor al arrancar (clic o arrastrar la imagen = capa en el canvas)

  const ejecutar = async (accion) => {
    try { await accion(); await recargar(); } catch (error) { avisarError(error.codigo); }
  };

  function editarNombre(boton, item) {
    const campo = elemento('input', 'gif-nombre-campo');
    campo.value = item.nombre;
    campo.maxLength = 60;
    boton.replaceWith(campo);
    campo.focus();
    campo.select();
    let hecho = false;
    const terminar = (guardar) => {
      if (hecho) return;
      hecho = true;
      if (guardar && campo.value.trim() && campo.value.trim() !== item.nombre) ejecutar(() => pedir('PATCH', { nombre: campo.value }, `/${item.id}`));
      else campo.replaceWith(boton);
    };
    campo.addEventListener('keydown', (evento) => {
      evento.stopPropagation();
      if (evento.key === 'Enter') terminar(true);
      else if (evento.key === 'Escape') terminar(false);
    });
    campo.addEventListener('blur', () => terminar(true));
  }

  function tarjeta(item) {
    const card = elemento('article', 'gif-tarjeta');
    const vista = elemento('div', 'gif-vista');
    const imagen = elemento('img', 'gif-medio');
    imagen.src = item.src;
    imagen.alt = '';
    imagen.loading = 'lazy';
    vista.append(imagen);
    const nombre = elemento('button', 'gif-nombre', item.nombre);
    nombre.type = 'button';
    nombre.title = t('gifs.renombrar');
    nombre.addEventListener('click', () => editarNombre(nombre, item));
    const acciones = elemento('div', 'gif-acciones');
    acciones.append(
      botonIcono('content_copy', 'copiarUrl', () => navigator.clipboard.writeText(new URL(item.src, window.location.origin).href).then(() => showToast(t('gifs.copiado'), 'success'))),
      botonEliminar(() => ejecutar(async () => { await pedir('DELETE', null, `/${item.id}`); showToast(t('gifs.eliminado'), 'success'); })),
    );
    card.append(vista, nombre, acciones);
    llevarAlCanvas?.(vista, card, item,idCapaGif(`m${item.id}`));
    return card;
  }

  function pintar() {
    contador.textContent = t('overlayCat.editor.mediaContador', { n: items.length });
    rejilla.replaceChildren(...(items.length ? items.map(tarjeta) : [elemento('p', 'gif-vacio', t('overlayCat.editor.mediaVacio'))]));
    aplicarTraducciones(raiz);
  }

  async function recargar() {
    try { items = (await pedir('GET')).items; } catch (error) { avisarError(error.codigo); return; }
    pintar();
  }

  entrada.addEventListener('change', async () => {
    const formulario = new FormData();
    [...entrada.files].forEach((archivo) => formulario.append('imagenes', archivo));
    entrada.value = '';
    if (![...formulario.keys()].length) return;
    try {
      const { rechazos } = await pedir('POST', formulario);
      if (rechazos.length) avisarError(rechazos[0]);
      else showToast(t('overlayCat.editor.mediaSubido'), 'success');
    } catch (error) { avisarError(error.codigo); }
    recargar();
  });

  return { raiz, abrir: recargar, conectar: (funcion) => { llevarAlCanvas = funcion; } };
}
