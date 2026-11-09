import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml } from './compartido/escapar-html.js';
import { crearColaAlertas, programarRetiro, PLATFORM_META } from './compartido/cola-alertas.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { iniciarFuenteAlerta } from './compartido/fuente-alerta.js';
import { cargarImagenesRegalo, imagenRegalo as rutaImagenRegalo } from './compartido/imagen-regalo.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';
import { crearFotoConIcono } from './compartido/foto-con-icono.js';
import { crearImagenGifAlerta } from './compartido/imagen-gif-alerta.js';
import { reproducirSonidoAlerta } from './compartido/sonido-alerta.js';
import { aplicarPosicionTexto } from './compartido/posicion-texto-alerta.js';
import { cargarRecurso, etiquetaRegalo, recursoDeEvento } from './compartido/recurso-plataforma.js';
import { elegirEntrada } from './compartido/epik/anfitrion.js';

function nativo() {
  const cfgFijo = iniciarOverlayFijo('alertas', 440, 130);
  registrarErroresOverlay();
  const params = leerParametros();
  const vistaPrevia = esVistaPrevia(params);
  aplicarParametrosVisuales(params);
  const alertDur = intParam(params, 'dur', 4000);
  const userSetColor = !!params.get('color');
  const listas = cargarImagenesRegalo();

  function useEmojiFor(el) {
    const span = document.createElement('span');
    span.className = 'gift-fallback';
    span.textContent = '🎁';
    if (el.isConnected) el.replaceWith(span);
    return span;
  }

  function showGenericAlert(d, done) {
    if (d.type !== 'superchat') { done(); return; }
    const meta = PLATFORM_META[d.platform] || PLATFORM_META.tiktok;
    const card = document.createElement('div');
    card.className = `alert-card anim-${cfgFijo.animacionEntrada}`;
    if (!userSetColor) card.style.setProperty('--accent', d.color || meta.color);
    card.innerHTML = `<span class="gift-fallback">💰</span><div class="info"><div class="action-label">${meta.label} · SUPERCHAT</div><div class="gift-name">${escaparHtml(d.user || t('overlayStr.anonymous'))}</div>${d.comment ? `<div class="username">${escaparHtml(d.comment)}</div>` : ''}</div>${d.amount ? `<div class="qty-badge">${escaparHtml(d.amount)}</div>` : ''}`;
    const recurso = recursoDeEvento(d);
    if (recurso) {
      const img = document.createElement('img');
      img.className = 'gift-img';
      img.alt = '';
      cargarRecurso(img, recurso, () => img.replaceWith(useEmojiFor(img)));
      card.querySelector('.gift-fallback').replaceWith(img);
    }
    const gif = crearImagenGifAlerta(cfgFijo.gifAlerta, cfgFijo);
    if (gif) card.firstElementChild.replaceWith(gif);
    aplicarPosicionTexto(card, cfgFijo);
    document.body.appendChild(card);
    if (!vistaPrevia) reproducirSonidoAlerta(cfgFijo);
    programarRetiro(card, d.duration || alertDur, done, cfgFijo.animacionSalida);
  }

  function showAlert(gift, done) {
    if (gift.type && gift.type !== 'gift') { showGenericAlert(gift, done); return; }
    const nombreRegalo = etiquetaRegalo(t, gift);
    const imgSrc = gift.kind ? null : rutaImagenRegalo(gift.giftName);
    const cdnSrc = gift.giftPictureUrl || '';
    const card = document.createElement('div');
    card.className = `alert-card anim-${cfgFijo.animacionEntrada}`;
    const img = document.createElement('img');
    img.className = 'gift-img';
    img.alt = nombreRegalo;
    if (imgSrc) { img.src = imgSrc; img.onerror = () => { if (cdnSrc) { img.src = cdnSrc; img.onerror = () => useEmojiFor(img); } else useEmojiFor(img); }; }
    else if (cdnSrc) { img.src = cdnSrc; img.onerror = () => useEmojiFor(img); }
    const recurso = gift.kind ? recursoDeEvento(gift) : null;
    if (recurso) cargarRecurso(img, recurso, () => useEmojiFor(img));
    const imagenRegalo = imgSrc || cdnSrc || recurso ? img : useEmojiFor(img);
    card.appendChild(crearImagenGifAlerta(cfgFijo.gifAlerta, cfgFijo) || (cfgFijo.imagenAlerta === 'perfil' ? crearFotoConIcono(gift, imagenRegalo) : imagenRegalo));
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<div class="action-label">${t('overlayStr.giftReceived')}</div><div class="gift-name">${escaparHtml(nombreRegalo)}</div><div class="username">${t('overlayStr.giftFrom', { user: escaparHtml(gift.user) })}</div>${gift.usdValue && cfgFijo.mostrarMonto !== 'no' ? `<div class="usd-value">≈ $${escaparHtml(String(gift.usdValue))} USD</div>` : ''}`;
    card.appendChild(info);
    if ((gift.repeatCount || 1) > 1) { const badge = document.createElement('div'); badge.className = 'qty-badge'; badge.textContent = 'x' + gift.repeatCount; card.appendChild(badge); }
    aplicarPosicionTexto(card, cfgFijo);
    document.body.appendChild(card);
    if (!vistaPrevia) reproducirSonidoAlerta(cfgFijo);
    if (!vistaPrevia) programarRetiro(card, gift.duration || alertDur, done, cfgFijo.animacionSalida); // la vista previa deja la tarjeta fija
  }

  const cola = crearColaAlertas(showAlert);
  const aplicarA11y = iniciarAccesibilidadOverlay();
  cargarLocaleOverlay().then(() => {
    aplicarI18nOverlay();
    // Espera la lista de regalos para que el primero salga con su imagen.
    listas.then(() => iniciarFuenteAlerta('alertas', { params, vistaPrevia, alAlerta: cola.encolar, alConfig: aplicarA11y, sonido: cfgFijo }));
  });
}

elegirEntrada({ nativo, epik: () => import('./compartido/epik/anfitrion-alerta.js').then((m) => m.iniciar('alertas', nativo)) });
