import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml } from './compartido/escapar-html.js';
import { crearColaAlertas, programarRetiro } from './compartido/cola-alertas.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { iniciarFuenteAlerta } from './compartido/fuente-alerta.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';
import { crearFotoConIcono } from './compartido/foto-con-icono.js';
import { crearImagenGifAlerta } from './compartido/imagen-gif-alerta.js';
import { reproducirSonidoAlerta } from './compartido/sonido-alerta.js';
import { aplicarPosicionTexto } from './compartido/posicion-texto-alerta.js';
import { logoPlataforma } from './compartido/recurso-plataforma.js';
import { elegirEntrada } from './compartido/epik/anfitrion.js';

function nativo() {
  const cfgFijo = iniciarOverlayFijo('alertas-social', 440, 130);
  registrarErroresOverlay();

  const params = leerParametros();
  const vistaPrevia = esVistaPrevia(params);
  aplicarParametrosVisuales(params);
  const alertDur = intParam(params, 'dur', 4000);
  const userSetColor = !!params.get('color');

  // PLATFORM_META aca es distinto al de overlay-alertas.js (agrega tiktok con
  // otro color de marca): esta tarjeta la puede disparar follow/share desde
  // cualquier plataforma, no solo eventos con "meta" propio como sub/cheer.
  const PLATFORM_META = {
    tiktok: { label: 'TIKTOK', color: '#ff0050' },
    twitch: { label: 'TWITCH', color: '#9146FF' },
    youtube: { label: 'YOUTUBE', color: '#FF0000' },
    kick: { label: 'KICK', color: '#53FC18' },
  };

  function makeDefaultIcon(isFollow, platform) {
    const d = document.createElement('div');
    d.className = 'event-emoji';
    const logo = logoPlataforma(platform);
    if (logo) {
      const img = document.createElement('img');
      img.src = logo;
      img.alt = '';
      d.append(img);
    } else d.textContent = isFollow ? '💜' : '🔗';
    return d;
  }

  function showAlert(event, alTerminar) {
    const isFollow = event.type === 'follow';
    const meta = PLATFORM_META[event.platform] || null;
    const card = document.createElement('div');
    card.className = `alert-card anim-${cfgFijo.animacionEntrada}`;
    if (meta && !userSetColor) card.style.setProperty('--accent', meta.color);

    const icono = makeDefaultIcon(isFollow, event.platform);
    card.appendChild(crearImagenGifAlerta(cfgFijo.gifAlerta, cfgFijo) || (cfgFijo.imagenAlerta === 'perfil' ? crearFotoConIcono({ user: event.username || event.user, avatar: event.avatar }, icono) : icono));

    const info = document.createElement('div');
    info.className = 'info';
    const platPrefix = meta ? `${meta.label} · ` : '';
    info.innerHTML = `
      <div class="action-label">${platPrefix}${isFollow ? t('overlayStr.newFollower') : t('overlayStr.shared')}</div>
      <div class="event-name">${escaparHtml(event.username || event.user || t('overlayStr.someone'))}</div>
      <div class="username">${isFollow ? t('overlayStr.followed') : t('overlayStr.sharedStream')}</div>
    `;
    card.appendChild(info);

    const badge = document.createElement('div');
    badge.className = 'type-badge';
    badge.textContent = isFollow ? '💜 Follow' : '🔗 Share';
    card.appendChild(badge);

    aplicarPosicionTexto(card, cfgFijo);
    document.body.appendChild(card);
    if (!vistaPrevia) reproducirSonidoAlerta(cfgFijo);
    if (!vistaPrevia) programarRetiro(card, event.duration || alertDur, alTerminar, cfgFijo.animacionSalida); // la vista previa deja la tarjeta fija
  }

  const cola = crearColaAlertas(showAlert);

  const aplicarA11y = iniciarAccesibilidadOverlay();

  cargarLocaleOverlay().then(() => {
    aplicarI18nOverlay();
    iniciarFuenteAlerta('alertas-social', { params, vistaPrevia, alAlerta: cola.encolar, alConfig: aplicarA11y, sonido: cfgFijo });
  });
}

elegirEntrada({ nativo, epik: () => import('./compartido/epik/anfitrion-alerta.js').then((m) => m.iniciar('alertas-social', nativo)) });
