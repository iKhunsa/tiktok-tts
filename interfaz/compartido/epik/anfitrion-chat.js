import { avatarGenerado } from '../avatar-generado.js';
import { iniciarFuenteChat, muestraChatDe, partesDelTexto, rolDe } from '../fuente-chat.js';
import { prepararEpik } from './anfitrion.js';

const absoluta = (url) => (url ? new URL(url, location.href).href : null);
const PAUSA_DEMO_MS = 1800;
let siguienteId = 1;

/**
 * Contrato publico de un mensaje (ficha del kit, docs/tipos/chat.md): nombres en espanol, URLs absolutas,
 * el texto ya partido en trozos (texto / emote) para no tener que interpretar HTML.
 */
const mensajePublico = (d) => ({
  id: siguienteId++,
  plataforma: d.platform,
  usuario: d.user || '',
  texto: String(d.comment ?? ''),
  partes: partesDelTexto(d.comment, d.emotes).map((parte) => (parte.emote ? { emote: parte.emote, url: absoluta(parte.url) } : parte)),
  avatar: absoluta(d.avatar),
  avatarRespaldo: avatarGenerado(d.user || '?'),
  insignia: d.badge?.url ? { url: absoluta(d.badge.url), nombre: d.badge.label || '' } : null,
  rol: rolDe(d),
});

/**
 * .epik de la familia `chat` (chat unificado y los de una plataforma: misma pagina, plataforma fija en la URL).
 * La app filtra por plataforma y por rol (ajustes del overlay); cuantos mostrar y cuando ocultarlos lo decide
 * el diseno con `maxmsgs` y `ocultarTras` de la config.
 */
export async function iniciar(nativo) {
  const epik = await prepararEpik({ familia: 'chat', overlay: 'chat', nativo });
  if (!epik) return;
  const { cfg } = epik;
  const mandar = (d) => {
    if (!cfg.platforms[d.platform] || !cfg[`${rolDe(d)}Mostrar`]) return;
    epik.enviar('mensaje', mensajePublico(d));
  };
  // Vista previa: entra la muestra y despues un mensaje cada poco, para ver entradas y salidas.
  if (epik.vistaPrevia) {
    const muestra = muestraChatDe(cfg);
    muestra.forEach(mandar);
    let turno = 0;
    setInterval(() => mandar(muestra[turno++ % muestra.length]), PAUSA_DEMO_MS);
  }
  iniciarFuenteChat({ alMensaje: mandar, alConfig: epik.alConfig });
}
