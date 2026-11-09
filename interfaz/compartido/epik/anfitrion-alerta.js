import { avatarGenerado } from '../avatar-generado.js';
import { crearColaAlertas, PLATFORM_META } from '../cola-alertas.js';
import { EVENTOS_ALERTA } from '../eventos-alerta.js';
import { iniciarFuenteAlerta, maxPendientesDe } from '../fuente-alerta.js';
import { t } from '../i18n-overlay.js';
import { cargarImagenesRegalo, imagenRegalo } from '../imagen-regalo.js';
import { etiquetaRegalo, recursoDeEvento } from '../recurso-plataforma.js';
import { reproducirSonidoAlerta } from '../sonido-alerta.js';
import { prepararEpik } from './anfitrion.js';

const absoluta = (url) => (url ? new URL(url, location.href).href : null);
const MARGEN_SALIDA_MS = 150;

/** Que alerta es un evento crudo: el id de EVENTOS_ALERTA que le corresponde, o `regalo` (regalo de TikTok). */
const tipoDe = (d) => Object.keys(EVENTOS_ALERTA).find((id) => EVENTOS_ALERTA[id].coincide(d)) || (d.type === 'gift' ? 'regalo' : d.type);

function imagenDe(d, tipo) {
  if (tipo === 'regalo') return { imagen: absoluta(imagenRegalo(d.giftName) || d.giftPictureUrl), imagenRespaldo: null };
  const recurso = recursoDeEvento(d);
  return { imagen: absoluta(recurso?.src), imagenRespaldo: absoluta(recurso?.reserva) };
}

/**
 * Contrato publico de una alerta (ficha del kit, docs/tipos/alerta.md): nombres en espanol, URLs absolutas,
 * textos ya traducidos al idioma del streamer y nada que no sea de la alerta.
 */
function alertaPublica(d, duracion, gif) {
  const tipo = tipoDe(d);
  const usuario = EVENTOS_ALERTA[tipo]?.sinUsuario ? null : (d.username || d.user || null);
  const esRegalo = d.type === 'gift';
  return {
    tipo,
    plataforma: d.platform || null,
    usuario,
    avatar: absoluta(d.avatar),
    avatarRespaldo: usuario ? avatarGenerado(usuario) : null,
    // El GIF elegido en el editor de canvas sustituye a la imagen de la alerta, igual que en las alertas nativas.
    ...(gif ? { imagen: absoluta(gif), imagenRespaldo: null } : imagenDe(d, tipo)),
    titulo: tipo === 'regalo' ? t('overlayStr.giftReceived') : t(`overlayCat.ov.${tipo}.titulo`),
    accion: tipo === 'regalo' ? null : t(`overlayCat.alerta.${tipo}`),
    regalo: esRegalo ? etiquetaRegalo(t, d) || null : null,
    cantidad: esRegalo ? d.repeatCount || 1 : 1,
    monto: d.amount == null || d.kind === 'sub' ? null : String(d.amount),
    valorUsd: d.usdValue || null,
    mensaje: d.comment || null,
    color: d.color || PLATFORM_META[d.platform]?.color || null,
    duracion,
  };
}

/**
 * .epik de la familia `alerta` (alertas de regalos, alertas-social y las de EVENTOS_ALERTA). La cola y el
 * retiro los lleva la app: manda `alerta` con los datos, a los `duracion` ms manda `alerta` = null (el diseno
 * la saca con su animacion de salida) y tras la salida pasa a la siguiente. En la vista previa queda fija.
 */
export async function iniciar(overlay, nativo) {
  const epik = await prepararEpik({ familia: 'alerta', overlay, nativo });
  if (!epik) return;
  const duracionBase = Number(epik.params.get('dur')) || EVENTOS_ALERTA[overlay]?.duracion || epik.cfg.dur || 4000;
  const salidaMs = (epik.cfg.animacionSalida === 'ninguna' ? 0 : epik.cfg.duracionSalida || 300) + MARGEN_SALIDA_MS;

  const cola = crearColaAlertas((d, alTerminar) => {
    const duracion = d.duration || duracionBase;
    epik.enviar('alerta', alertaPublica(d, duracion, epik.cfg.gifAlerta));
    if (epik.vistaPrevia) return;
    reproducirSonidoAlerta(epik.cfg); // el sonido elegido en el editor suena tambien con una skin .epik
    setTimeout(() => {
      epik.enviar('alerta', null);
      setTimeout(alTerminar, salidaMs);
    }, duracion);
  }, { maxPendientes: maxPendientesDe(overlay) });

  await cargarImagenesRegalo();
  iniciarFuenteAlerta(overlay, { params: epik.params, vistaPrevia: epik.vistaPrevia, alAlerta: cola.encolar, alConfig: epik.alConfig, sonido: epik.cfg });
}
