import { cargarLocaleOverlay, t } from '../i18n-overlay.js';
import { leerParametros } from '../parametros.js';
import { esVistaPrevia } from '../vista-previa.js';
import { iniciarAccesibilidadOverlay } from '../accesibilidad.js';
import { registrarErroresOverlay } from '../registrar-errores.js';
import { avatarGenerado } from '../avatar-generado.js';
import { ESQUEMAS } from '../estilo/esquemas.js';
import { leerConfig } from '../estilo/query.js';
import { iniciarFuenteMusica, idDeCancion, segundosDe } from '../fuente-musica.js';
import { idDeSkin } from './skin-epik.js';
import { montarEpik } from './anfitrion.js';

// Contrato de datos de un .epik de musica (documentado en la guia del SDK): nombres en espanol,
// URLs absolutas (el iframe tiene otro origen) y nada que no sea de la cancion.
const absoluta = (url) => (url ? new URL(url, location.href).href : null);
const urlVideo = (cancion) => {
  if (cancion.video) return absoluta(cancion.video); // las muestras traen su video local
  return cancion.videoId ? `${location.origin}/api/music/video?videoId=${encodeURIComponent(cancion.videoId)}` : null;
};

function cancionPublica(cancion) {
  if (!cancion) return null;
  const pedidoPor = cancion.requestedBy || null;
  return {
    id: idDeCancion(cancion),
    titulo: cancion.title || '',
    artista: cancion.channelName || cancion.channel || '',
    portada: absoluta(cancion.thumbnail),
    duracion: segundosDe(cancion.duration),
    pedidoPor,
    avatarPedido: cancion.requestedByAvatar || null,
    avatarRespaldo: pedidoPor ? avatarGenerado(pedidoPor) : null,
    video: urlVideo(cancion),
  };
}

const progresoPublico = (p) => p && { id: p.videoId ?? null, posicion: p.position || 0, duracion: p.duration || 0, pausada: !!p.paused };

registrarErroresOverlay();
const params = leerParametros();
const vistaPrevia = esVistaPrevia(params);
const demo = vistaPrevia && params.get('demo') === '1';
const cfg = leerConfig(ESQUEMAS.musica, params);

async function iniciar() {
  await cargarLocaleOverlay();
  const textos = {
    sonandoAhora: t('overlayCat.musicaSonando'),
    siguientes: t('overlayCat.musicaSiguientes'),
    pedidaPor: t('overlayCat.musicaPedida', { user: '{user}' }),
  };
  const epik = await montarEpik({ id: idDeSkin(cfg.skin), tipo: 'musica', cfgBase: cfg, textos, params });

  if (!epik) {
    await import('../../overlay-musica.js'); // paquete borrado o roto: se ve el overlay de siempre
  } else {
    iniciarAccesibilidadOverlay((movimientoReducido) => epik.enviar('a11y', { movimientoReducido }));
    iniciarFuenteMusica({
      vistaPrevia,
      demo,
      alCancion: (cancion, progreso) => {
        epik.enviar('cancion', cancionPublica(cancion));
        if (progreso) epik.enviar('progreso', progresoPublico(progreso));
      },
      alProgreso: (progreso) => epik.enviar('progreso', progresoPublico(progreso)),
      alCola: (cola) => epik.enviar('cola', cola.map(cancionPublica)),
      alConfig: (config) => epik.enviar('a11y', { movimientoReducido: !!config.a11yReduceMotion }),
    });
  }
}

iniciar();
