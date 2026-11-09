import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { crearColaAlertas, programarRetiro, PLATFORM_META } from './compartido/cola-alertas.js';
import { iniciarFuenteAlerta, maxPendientesDe } from './compartido/fuente-alerta.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { EVENTOS_ALERTA } from './compartido/eventos-alerta.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';
import { crearFotoConIcono } from './compartido/foto-con-icono.js';
import { crearImagenGifAlerta } from './compartido/imagen-gif-alerta.js';
import { reproducirSonidoAlerta } from './compartido/sonido-alerta.js';
import { aplicarPosicionTexto } from './compartido/posicion-texto-alerta.js';
import { cargarRecurso, recursoDeEvento } from './compartido/recurso-plataforma.js';
import { elegirEntrada } from './compartido/epik/anfitrion.js';

function nativo() {
  registrarErroresOverlay();

  const params = leerParametros();
  const vistaPrevia = esVistaPrevia(params);
  aplicarParametrosVisuales(params);
  const idAlerta = params.get('evento');
  const alerta = EVENTOS_ALERTA[idAlerta];
  const cfgFijo = alerta ? iniciarOverlayFijo(idAlerta, 440, 130) : null;
  const duracion = intParam(params, 'dur', alerta?.duracion || 4000);
  const colorPropio = !!params.get('color');

  function crearElemento(clase, texto) {
    const elemento = document.createElement('div');
    elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
  }

  function crearIcono(evento) {
    const gif = crearImagenGifAlerta(cfgFijo?.gifAlerta, cfgFijo);
    if (gif) return gif;
    const contenedor = crearElemento('icono');
    const imagen = document.createElement('img');
    imagen.alt = '';
    const iconoPropio = `icons/${alerta.icono}.svg`;
    const recurso = recursoDeEvento(evento);
    if (recurso) cargarRecurso(imagen, recurso, () => { imagen.onerror = null; imagen.classList.remove('sticker'); imagen.src = iconoPropio; });
    else imagen.src = iconoPropio;
    if (recurso) imagen.className = evento.kind === 'kicksgift' ? 'sticker regalo-kick' : 'sticker';
    contenedor.append(imagen);
    // Las alertas sin persona (fin del directo) siempre llevan su icono.
    return cfgFijo?.imagenAlerta === 'perfil' && !alerta.sinUsuario ? crearFotoConIcono(evento, contenedor) : contenedor;
  }

  function mostrarAlerta(evento, alTerminar) {
    const meta = PLATFORM_META[evento.platform];
    const tarjeta = crearElemento('alert-card');
    tarjeta.classList.add(`anim-${cfgFijo.animacionEntrada}`);
    if (meta && !colorPropio) tarjeta.style.setProperty('--accent', evento.color || meta.color);

    const titulo = t(`overlayCat.ov.${idAlerta}.titulo`);
    const accion = t(`overlayCat.alerta.${idAlerta}`);
    const info = crearElemento('info');
    info.append(crearElemento('etiqueta', meta ? `${meta.label} · ${titulo}` : titulo));
    info.append(crearElemento('nombre', alerta.sinUsuario ? accion : (evento.user || t('overlayStr.someone'))));
    if (!alerta.sinUsuario) info.append(crearElemento('accion', accion));
    tarjeta.append(crearIcono(evento), info);

    const valorInsignia = alerta.insignia?.(evento);
    if (valorInsignia) tarjeta.append(crearElemento('insignia', String(valorInsignia)));

    aplicarPosicionTexto(tarjeta, cfgFijo);
    document.body.append(tarjeta);
    if (!vistaPrevia) reproducirSonidoAlerta(cfgFijo);
    if (!vistaPrevia) programarRetiro(tarjeta, evento.duration || duracion, alTerminar, cfgFijo.animacionSalida); // la vista previa deja la tarjeta fija
  }

  const cola = crearColaAlertas(mostrarAlerta, { maxPendientes: maxPendientesDe(idAlerta) });
  const aplicarA11y = iniciarAccesibilidadOverlay();

  cargarLocaleOverlay().then(() => {
    aplicarI18nOverlay();
    iniciarFuenteAlerta(idAlerta, { params, vistaPrevia, alAlerta: cola.encolar, alConfig: aplicarA11y });
  });
}

elegirEntrada({ nativo, epik: () => import('./compartido/epik/anfitrion-alerta.js').then((m) => m.iniciar(new URLSearchParams(location.search).get('evento'), nativo)) });
