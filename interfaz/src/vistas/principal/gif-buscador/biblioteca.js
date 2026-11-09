import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { apiGifs } from './api.js';
import { permitirArrastreGif } from './arrastrar-gif.js';

const TODOS = 'todos';
const SIN_CARPETA = 'sin-carpeta';
const CONFIRMAR_MS = 3000;

const normalizar = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
// Un codigo sin traduccion (t devuelve la propia clave) cae al aviso generico.
const avisarError = (error) => {
  const clave = `gifs.error.${error.codigo}`;
  showToast(t(clave) === clave ? t('gifs.cargarError') : t(clave), 'error');
};
const urlCompleta = (item) => (item.modo === 'enlace' ? item.url : new URL(item.src, window.location.origin).href);

// Todo texto que viene de la web (nombres, dominios) entra con textContent / propiedades, nunca como HTML.
export function elemento(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function botonIcono(icono, clave, alPulsar, extra = '') {
  const b = elemento('button', `gif-icono-boton ${extra}`.trim());
  b.type = 'button';
  b.dataset.i18nTitle = `gifs.${clave}`;
  b.dataset.i18nAriaLabel = `gifs.${clave}`;
  const img = elemento('img');
  img.src = `icons/${icono}.svg`;
  img.alt = '';
  b.append(img);
  b.addEventListener('click', alPulsar);
  return b;
}

// Eliminar pide una segunda pulsacion: la primera arma el boton unos segundos.
export function botonEliminar(alConfirmar) {
  const b = botonIcono('delete', 'eliminar', () => {
    if (b.dataset.armado) { clearTimeout(Number(b.dataset.armado)); alConfirmar(); return; }
    b.classList.add('armado');
    b.title = t('gifs.confirmar');
    b.dataset.armado = String(setTimeout(() => { b.classList.remove('armado'); b.title = t('gifs.eliminar'); delete b.dataset.armado; }, CONFIRMAR_MS));
  }, 'peligro');
  return b;
}

function crearVista(item) {
  const medio = item.tipo === 'video' ? elemento('video', 'gif-medio') : elemento('img', 'gif-medio');
  medio.src = item.src;
  if (item.tipo === 'video') Object.assign(medio, { muted: true, loop: true, autoplay: true, playsInline: true });
  else { medio.alt = ''; medio.loading = 'lazy'; }
  return medio;
}

/**
 * Biblioteca "Mis GIFs" (o "Mis sonidos"): ver, buscar, organizar en carpetas, renombrar, eliminar y copiar la
 * URL de cada archivo. `api` es el cliente de su biblioteca, `vistaMedio` pinta cada archivo (y `controles`, si hay, su reproductor aparte, fuera del area que se arrastra), `claves` son los
 * textos que cambian entre bibliotecas y `evento` el que se avisa al document cuando cambia su contenido.
 */
export function crearBiblioteca({
  alCambiar, api = apiGifs, vistaMedio = crearVista, controles = null, evento = 'gifs:cambiaron',
  claves = { buscar: 'gifs.buscar', contador: 'gifs.contador', vacio: 'gifs.vacio' },
}) {
  const raiz = elemento('div', 'gif-biblioteca');
  const lateral = elemento('aside', 'gif-carpetas');
  const principal = elemento('div', 'gif-principal');
  const herramientas = elemento('div', 'gif-herramientas');
  const buscador = elemento('input', 'gif-buscar');
  buscador.type = 'search';
  buscador.dataset.i18nPlaceholder = claves.buscar;
  buscador.dataset.i18nAriaLabel = claves.buscar;
  const contador = elemento('span', 'gif-contador');
  herramientas.append(buscador, contador);
  const rejilla = elemento('div', 'gif-rejilla');
  principal.append(herramientas, rejilla);
  raiz.append(lateral, principal);

  let datos = { items: [], carpetas: [] };
  let filtro = TODOS;
  let texto = '';

  const visibles = () => datos.items.filter((item) => {
    const enCarpeta = filtro === TODOS || (filtro === SIN_CARPETA ? !item.carpeta : item.carpeta === filtro);
    return enCarpeta && (!texto || normalizar(`${item.nombre} ${item.dominio || ''}`).includes(texto));
  });

  // Ejecuta una accion de la API y repinta con lo que devuelve el servidor, avisando si falla.
  const ejecutar = async (accion) => {
    try { await accion(); await recargar(); } catch (error) { avisarError(error); }
  };

  function tarjeta(item) {
    const caducado = item.estado === 'caducado';
    const card = elemento('article', `gif-tarjeta${caducado ? ' caducado' : ''}`);
    const vista = elemento('div', 'gif-vista');
    const medio = vistaMedio(item);
    medio.addEventListener('error', () => card.classList.add('caducado')); // un enlace roto se nota al instante
    vista.append(medio);
    permitirArrastreGif(vista, { tarjeta: card, destinoEn, alSoltar: (destino) => moverA(item, destino) });
    const aviso = elemento('span', 'gif-aviso');
    aviso.append(Object.assign(elemento('img'), { src: 'icons/link_off.svg', alt: '' }), elemento('span', '', t('gifs.caducado')));
    vista.append(aviso, elemento('span', 'gif-insignia', t(item.modo === 'enlace' ? 'gifs.enlace' : 'gifs.archivo')));

    const nombre = elemento('button', 'gif-nombre', item.nombre);
    nombre.type = 'button';
    nombre.title = t('gifs.renombrar');
    nombre.addEventListener('click', () => editarNombre(nombre, item));

    const carpeta = elemento('select', 'gif-mover');
    carpeta.dataset.i18nAriaLabel = 'gifs.moverA';
    carpeta.append(Object.assign(elemento('option', '', t('gifs.sinCarpeta')), { value: '' }));
    datos.carpetas.forEach((c) => carpeta.append(Object.assign(elemento('option', '', c.nombre), { value: c.id })));
    carpeta.value = item.carpeta || '';
    carpeta.addEventListener('change', () => ejecutar(() => api.actualizar(item.id, { carpeta: carpeta.value || null })));

    const acciones = elemento('div', 'gif-acciones');
    acciones.append(
      botonIcono('content_copy', 'copiarUrl', () => navigator.clipboard.writeText(urlCompleta(item)).then(() => showToast(t('gifs.copiado'), 'success'))),
      botonEliminar(() => ejecutar(async () => { await api.borrar(item.id); showToast(t('gifs.eliminado'), 'success'); })),
    );
    card.append(vista, ...(controles ? [controles(item)] : []), nombre, elemento('span', 'gif-dominio', item.dominio || ''), carpeta, acciones);
    return card;
  }

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
      if (guardar && campo.value.trim() && campo.value.trim() !== item.nombre) ejecutar(() => api.actualizar(item.id, { nombre: campo.value }));
      else campo.replaceWith(boton);
    };
    campo.addEventListener('keydown', (evento) => { if (evento.key === 'Enter') terminar(true); else if (evento.key === 'Escape') terminar(false); });
    campo.addEventListener('blur', () => terminar(true));
  }

  // Las carpetas (y "Sin carpeta") que aceptan GIFs, por su fila; "Todos" no es un destino. Se rehace en cada pintado.
  const destinos = new Map();
  const permitirSoltar = (fila, destino, nombre) => destinos.set(fila, { fila, destino, nombre });
  const destinoEn = (x, y) => destinos.get(document.elementFromPoint(x, y)?.closest('.gif-carpeta')) ?? null;

  function moverA(item, { destino, nombre }) {
    if ((item.carpeta || null) === destino) return; // ya estaba ahi
    ejecutar(async () => { await api.actualizar(item.id, { carpeta: destino }); showToast(t('gifs.movido', { carpeta: nombre }), 'success'); });
  }

  function elementoCarpeta(id, etiqueta, cantidad, carpeta) {
    const fila = elemento('div', `gif-carpeta${filtro === id ? ' activa' : ''}`);
    const abrir = elemento('button', 'gif-carpeta-nombre');
    abrir.type = 'button';
    abrir.append(elemento('span', 'gif-carpeta-texto', etiqueta), elemento('span', 'gif-carpeta-cuenta', String(cantidad)));
    abrir.addEventListener('click', () => { filtro = id; pintar(); });
    fila.append(abrir);
    if (id !== TODOS) permitirSoltar(fila, id === SIN_CARPETA ? null : id, carpeta?.nombre ?? t('gifs.sinCarpeta'));
    if (carpeta) {
      fila.append(
        botonIcono('edit', 'renombrar', () => renombrar(carpeta)),
        botonEliminar(() => ejecutar(async () => { await api.borrarCarpeta(carpeta.id); if (filtro === carpeta.id) filtro = TODOS; showToast(t('gifs.carpetaEliminada'), 'success'); })),
      );
    }
    return fila;
  }

  function renombrar(carpeta) {
    const campo = elemento('input', 'gif-nombre-campo');
    campo.value = carpeta.nombre;
    campo.maxLength = 40;
    const fila = [...lateral.querySelectorAll('.gif-carpeta')].find((f) => f.querySelector('.gif-carpeta-texto')?.textContent === carpeta.nombre);
    fila?.replaceChildren(campo);
    campo.focus();
    campo.select();
    let hecho = false;
    const terminar = (guardar) => {
      if (hecho) return;
      hecho = true;
      if (guardar && campo.value.trim() && campo.value.trim() !== carpeta.nombre) ejecutar(() => api.renombrarCarpeta(carpeta.id, campo.value));
      else pintar();
    };
    campo.addEventListener('keydown', (evento) => { if (evento.key === 'Enter') terminar(true); else if (evento.key === 'Escape') terminar(false); });
    campo.addEventListener('blur', () => terminar(true));
  }

  function formularioCarpeta() {
    const form = elemento('form', 'gif-nueva-carpeta');
    const campo = elemento('input');
    campo.dataset.i18nPlaceholder = 'gifs.nombreCarpeta';
    campo.dataset.i18nAriaLabel = 'gifs.nombreCarpeta';
    campo.maxLength = 40;
    const crear = elemento('button', 'gif-icono-boton');
    crear.type = 'submit';
    crear.dataset.i18nTitle = 'gifs.nuevaCarpeta';
    crear.append(Object.assign(elemento('img'), { src: 'icons/create_new_folder.svg', alt: '' }));
    form.append(campo, crear);
    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      if (!campo.value.trim()) return;
      ejecutar(async () => { const { carpeta } = await api.crearCarpeta(campo.value); filtro = carpeta.id; });
    });
    return form;
  }

  function pintar() {
    destinos.clear();
    const sinCarpeta = datos.items.filter((item) => !item.carpeta).length;
    lateral.replaceChildren(
      elementoCarpeta(TODOS, t('gifs.todos'), datos.items.length),
      elementoCarpeta(SIN_CARPETA, t('gifs.sinCarpeta'), sinCarpeta),
      ...datos.carpetas.map((c) => elementoCarpeta(c.id, c.nombre, datos.items.filter((item) => item.carpeta === c.id).length, c)),
      formularioCarpeta(),
    );
    const lista = visibles();
    contador.textContent = t(claves.contador, { n: lista.length });
    if (lista.length) rejilla.replaceChildren(...lista.map(tarjeta));
    else rejilla.replaceChildren(elemento('p', 'gif-vacio', t(datos.items.length ? 'gifs.sinResultados' : claves.vacio)));
    aplicarTraducciones(raiz);
    alCambiar(datos.items.length);
  }

  async function recargar() {
    try { datos = await api.listar(); } catch (error) { avisarError(error); return; }
    if (filtro !== TODOS && filtro !== SIN_CARPETA && !datos.carpetas.some((c) => c.id === filtro)) filtro = TODOS;
    pintar();
    document.dispatchEvent(new window.CustomEvent(evento));
  }

  buscador.addEventListener('input', () => { texto = normalizar(buscador.value.trim()); pintar(); });

  return {
    raiz,
    recargar,
    /** Al abrir la biblioteca se comprueban los enlaces que llevan un dia sin revisarse (los caducados se marcan). */
    async abrir() {
      await recargar();
      api.verificar?.().then((r) => { if (r.revisados) { datos.items = r.items; pintar(); } }).catch(() => {});
    },
  };
}
