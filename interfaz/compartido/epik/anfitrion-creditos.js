import { avatarGenerado } from '../avatar-generado.js';
import { iniciarFuenteCreditos, textoRegalos } from '../fuente-creditos.js';
import { t } from '../i18n-overlay.js';
import { prepararEpik } from './anfitrion.js';

const absoluta = (url) => (url ? new URL(url, location.href).href : null);
const AGRUPAR_MS = 500; // una lluvia de regalos manda un solo aviso
const MAX_SOCIAL = 10;
// Los titulos de la app traen un emoji delante («🎁 Donaciones»): al diseno le llega solo el texto.
const sinEmoji = (texto) => texto.replace(/^[^\p{L}\p{N}]+/u, '');

const persona = (entrada) => ({
  usuario: entrada.nombre,
  plataforma: entrada.platform || null,
  avatar: absoluta(entrada.avatar),
  avatarRespaldo: avatarGenerado(entrada.nombre),
});

/**
 * Contratos publicos (fichas del kit, docs/tipos/creditos.md y social.md):
 *  - creditos: evento `creditos` = { donadores: [{ ...persona, regalos }], seguidores: [persona], compartidos: [persona] }
 *    en orden de llegada (el primero que dono va primero).
 *  - social:   evento `social` = { seguidores: [persona], compartidos: [persona] }, los 10 mas recientes primero.
 * Personas unicas por nombre: el mismo usuario que sigue dos veces aparece una.
 */
const DATOS = {
  creditos: {
    textos: () => ({
      donaciones: sinEmoji(t('overlayStr.donations')),
      seguidores: sinEmoji(t('overlayStr.newFollowersSect')),
      compartidos: sinEmoji(t('overlayStr.sharedSect')),
      esperando: t('overlayStr.waitingEvents'),
    }),
    evento: 'creditos',
    publico: (c) => ({
      donadores: c.donors.map((d) => ({ ...persona(d), regalos: textoRegalos(t, d) })),
      seguidores: c.followers.map(persona),
      compartidos: c.sharers.map(persona),
    }),
  },
  social: {
    textos: () => ({
      seguidores: t('overlayStr.followers'),
      compartidos: t('overlayStr.sharedList'),
      sinSeguidores: t('overlayStr.noFollowers'),
      sinCompartidos: t('overlayStr.noShared'),
    }),
    evento: 'social',
    publico: (c) => ({
      seguidores: c.followers.slice(-MAX_SOCIAL).reverse().map(persona),
      compartidos: c.sharers.slice(-MAX_SOCIAL).reverse().map(persona),
    }),
  },
};

/** .epik de las familias `creditos` y `social` (overlay = familia: cada una tiene un solo overlay). */
export async function iniciar(overlay, nativo) {
  const datos = DATOS[overlay];
  const epik = await prepararEpik({ familia: overlay, overlay, textos: datos.textos, nativo });
  if (!epik) return;
  let espera = null;
  iniciarFuenteCreditos({
    vistaPrevia: epik.vistaPrevia,
    alCambio: (creditos, inicial) => {
      clearTimeout(espera);
      const mandar = () => epik.enviar(datos.evento, datos.publico(creditos));
      if (inicial) mandar();
      else espera = setTimeout(mandar, AGRUPAR_MS);
    },
    alConfig: epik.alConfig,
  });
}
