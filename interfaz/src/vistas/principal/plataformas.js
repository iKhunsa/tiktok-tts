import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { reproducirSonidoUi } from '../../componentes/sonido-ui.js';
import { mostrarAvisoConexionFallida } from './aviso-conexion-fallida.js';
import * as datosPorCuenta from '../../nucleo/estado/datos-por-cuenta.js';
import { switchView } from './vistas-router.js';
import { almacenSesion } from '../../nucleo/estado/sesion.js';

// Suena cuando el servidor confirma la conexion (junto al aviso "N conectados").
// El archivo original esta a -15 LUFS: 0.35 lo deja ~-24 LUFS, bajo el TTS.
const SONIDO_CONECTADO = { src: 'audio/ui/connect-wallet.mp3', volumen: 0.35 };

const PLATFORM_CHANNELS_KEY = 'tikliveTTS_platforms_v1';
export const PLATFORMS = ['tiktok', 'twitch', 'youtube', 'kick'];
export const PLATFORM_LABELS = { tiktok: 'TikTok', twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick' };

function loadPlatformChannels() {
  try {
    const raw = JSON.parse(datosPorCuenta.get(PLATFORM_CHANNELS_KEY) || '{}');
    const normalized = normalizeSavedChannels(raw);
    if (JSON.stringify(raw) !== JSON.stringify(normalized)) savePlatformChannels(normalized);
    return normalized;
  } catch (e) {
    return normalizeSavedChannels({});
  }
}

function savePlatformChannels(data) {
  datosPorCuenta.set(PLATFORM_CHANNELS_KEY, JSON.stringify(normalizeSavedChannels(data)));
}

function normalizeSavedChannels(data = {}) {
  const output = { tiktok: [], twitch: [], youtube: [], kick: [] };
  PLATFORMS.forEach((platform) => {
    const value = data?.[platform];
    const items = Array.isArray(value) ? value : (value ? [{ channel: value }] : []);
    items.forEach((item) => {
      const entry = normalizeChannelEntry(platform, item?.channel ?? item);
      if (!entry) return;
      entry.autoConnect = item?.autoConnect ?? entry.autoConnect;
      entry.mode = item?.mode || entry.mode;
      if (!output[platform].some((existing) => existing.channel === entry.channel)) {
        output[platform].push(entry);
      }
    });
  });
  return output;
}

function normalizeChannelEntry(platform, value) {
  const raw = String(value || '').trim();
  if (!raw || !PLATFORMS.includes(platform)) return null;

  if (platform === 'tiktok') {
    const channel = raw.replace(/^@+/, '').split(/[/?#]/)[0].trim();
    return channel ? { channel, autoConnect: true, mode: 'savedTarget' } : null;
  }

  if (platform === 'twitch') {
    const channel = raw.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '').replace(/^[@#]+/, '').split(/[/?#]/)[0].trim().toLowerCase();
    return channel ? { channel, autoConnect: true, mode: 'savedTarget' } : null;
  }

  if (platform === 'kick') {
    const channel = raw.replace(/^https?:\/\/(www\.)?kick\.com\//i, '').replace(/^[@#]+/, '').split(/[/?#]/)[0].trim().toLowerCase();
    return channel ? { channel, autoConnect: true, mode: 'savedTarget' } : null;
  }

  return normalizeYoutubeEntry(raw);
}

function normalizeYoutubeEntry(raw) {
  const videoEntry = (channel) => (channel ? { channel, autoConnect: false, mode: 'temporaryLive' } : null);
  const savedEntry = (channel) => (channel ? { channel, autoConnect: true, mode: 'savedTarget' } : null);

  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : (/youtube\.com|youtu\.be/i.test(raw) ? 'https://' + raw : raw);
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return videoEntry(url.pathname.split('/').filter(Boolean)[0]);
    if (host.endsWith('youtube.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (url.pathname === '/watch') return videoEntry(url.searchParams.get('v'));
      if (parts[0] === 'live') return videoEntry(parts[1]);
      if (parts[0] === 'channel') return savedEntry(parts[1]);
      if (parts[0]?.startsWith('@')) return savedEntry(parts[0]);
      if (parts[0] === 'c' || parts[0] === 'user') return savedEntry(parts[1] ? '@' + parts[1].replace(/^@+/, '') : '');
    }
  } catch (e) { /* no es URL valida, cae a los patrones de abajo */ }

  if (/^UC[\w-]{20,}$/i.test(raw)) return savedEntry(raw);
  if (/^@[\w.-]+$/i.test(raw)) return savedEntry(raw);
  if (/^[\w-]{11}$/.test(raw)) return videoEntry(raw);
  return savedEntry('@' + raw.replace(/^@+/, '').split(/[/?#]/)[0]);
}

function upsertSavedChannel(platform, entry) {
  if (!entry) return;
  const saved = loadPlatformChannels();
  saved[platform] = saved[platform].filter((item) => item.channel !== entry.channel);
  saved[platform].push(entry);
  savePlatformChannels(saved);
}

// Mi perfil > Vincular (unica entrada que queda para tiktok/youtube, ya que
// el formulario viejo de "Agregar canal" se elimino) modela un solo canal
// por plataforma -- a diferencia de upsertSavedChannel, esto PISA cualquier
// entrada anterior en vez de acumularla. Sin esto, corregir un canal mal
// tipeado dejaba las dos entradas guardadas y canalGuardado() seguia
// devolviendo la vieja (la primera del array).
function replaceSavedChannel(platform, entry) {
  if (!entry) return;
  const saved = loadPlatformChannels();
  saved[platform] = [entry];
  savePlatformChannels(saved);
}

function clearSavedChannels(platform) {
  const saved = loadPlatformChannels();
  saved[platform] = [];
  savePlatformChannels(saved);
}

let settingsChannelsRenderSeq = 0;

// Exportada: la usa "Mi cuenta" > Vincular (seccion-vincular.js) para
// desconectar tiktok/youtube. Limpia TODAS las entradas guardadas de la
// plataforma (no solo `channel`) -- Mi perfil modela un solo canal por
// plataforma, asi que "desvincular" es "dejar esta plataforma en blanco",
// incluso si quedo alguna entrada vieja de un canal mal tipeado.
export async function removeChannel(platform) {
  const saved = loadPlatformChannels();
  const entradas = saved[platform] || [];
  try {
    await Promise.allSettled(entradas.map((entry) => fetch('/api/platforms/disconnect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, channel: entry.channel }),
    })));
    clearSavedChannels(platform);
    renderSettingsChannels();
    showToast(t('toast.platformDisconnected').replace('{platform}', PLATFORM_LABELS[platform]));
  } catch (e) {
    showToast(t('toast.channelDisconnectError').replace('{platform}', platform));
  }
}

async function connectSavedChannels() {
  const saved = loadPlatformChannels();
  const targets = [];
  let manualCount = 0;

  PLATFORMS.forEach((platform) => {
    saved[platform].forEach((entry) => {
      if (entry.autoConnect) targets.push({ platform, entry });
      else manualCount++;
    });
  });

  if (targets.length === 0) {
    showToast(manualCount ? t('conn.onlyManualChannels') : t('conn.noSavedChannels'));
    return;
  }

  const chatBtn = document.getElementById('btn-connect-all-chat');
  if (chatBtn) { chatBtn.disabled = true; chatBtn.textContent = t('conn.connecting'); }

  let connected = 0;
  let failed = 0;
  for (const { platform, entry } of targets) {
    try {
      const res = await fetch('/api/platforms/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, channel: entry.channel }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        const connectedEntry = normalizeChannelEntry(platform, d.channel || entry.channel) || entry;
        connectedEntry.autoConnect = entry.autoConnect;
        connectedEntry.mode = entry.mode;
        upsertSavedChannel(platform, connectedEntry);
        connected++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }

  if (chatBtn) { chatBtn.disabled = false; chatBtn.textContent = t('btn.connectAll'); }
  renderSettingsChannels();
  if (connected > 0) reproducirSonidoUi(SONIDO_CONECTADO);
  else if (failed > 0) mostrarAvisoConexionFallida();
  const parts = [`${connected} conectados`];
  if (failed) parts.push(`${failed} fallidos`);
  if (manualCount) parts.push(`${manualCount} manual`);
  showToast(t('conn.connectAllMsg', { parts: parts.join(', ') }));
}

export async function toggleConnectAllChat() {
  const chatBtn = document.getElementById('btn-connect-all-chat');
  if (chatBtn && chatBtn.classList.contains('channels-connected')) {
    chatBtn.disabled = true;
    const prevText = chatBtn.textContent;
    chatBtn.textContent = t('conn.connecting');
    let channels = { tiktok: [], twitch: [], youtube: [], kick: [] };
    try {
      const res = await fetch('/api/channels');
      if (res.ok) channels = await res.json();
    } catch (e) { /* noop */ }
    const active = [];
    PLATFORMS.forEach((platform) => {
      (channels[platform] || []).forEach((ch) => {
        const normalized = normalizeChannelEntry(platform, ch)?.channel;
        if (normalized) active.push({ platform, channel: normalized });
      });
    });
    for (const { platform, channel } of active) {
      try {
        await fetch('/api/platforms/disconnect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, channel }),
        });
      } catch (e) { /* noop */ }
    }
    chatBtn.disabled = false;
    chatBtn.textContent = prevText;
    renderSettingsChannels();
    showToast(t('toast.allChannelsDisconnected'));
  } else {
    connectSavedChannels();
  }
}

async function updateChatConnectAllState(preloadedChannels) {
  const chatBtn = document.getElementById('btn-connect-all-chat');
  if (!chatBtn) return;
  let channels = preloadedChannels;
  if (!channels) {
    channels = { tiktok: [], twitch: [], youtube: [], kick: [] };
    try {
      const res = await fetch('/api/channels');
      if (res.ok) channels = await res.json();
    } catch (e) { /* noop */ }
  }
  const activeCount = PLATFORMS.reduce((sum, platform) => sum + (channels[platform] || []).length, 0);
  pintarCuentasVinculadas(chatBtn.closest('.chat-section'));
  if (activeCount > 0) {
    chatBtn.classList.add('channels-connected');
    chatBtn.title = `${activeCount} canal(es) conectado(s) — clic para desconectar`;
    chatBtn.textContent = chatBtn.matches(':hover') ? t('btn.disconnectAll') : t('btn.allConnected');
  } else {
    chatBtn.classList.remove('channels-connected');
    chatBtn.title = 'Sin canales conectados — clic para conectar todo';
    chatBtn.textContent = t('btn.connectAll');
  }
}

// Canales guardados (no los conectados): 0 => tarjeta grande en el chat,
// >=1 => boton chico + un logo por plataforma en el encabezado.
function pintarCuentasVinculadas(section) {
  if (!section) return;
  const saved = loadPlatformChannels();
  const vinculadas = PLATFORMS.filter((platform) => saved[platform].length > 0);
  section.classList.toggle('sin-cuentas', vinculadas.length === 0);
  const logos = document.getElementById('linkedPlatforms');
  if (!logos) return;
  logos.replaceChildren(...vinculadas.map((platform) => {
    const img = document.createElement('img');
    img.src = `icons/${platform}-logo.svg`;
    img.alt = PLATFORM_LABELS[platform];
    img.title = PLATFORM_LABELS[platform];
    return img;
  }));
}

/** Modal "Mi cuenta" > Vincular: hay un canal guardado para esa plataforma? (no hay OAuth para tiktok/youtube, el estado "vinculado" ahi es "tiene un canal guardado"). */
export function canalGuardado(platform) {
  const saved = loadPlatformChannels();
  return saved[platform]?.[0] || null;
}

/**
 * Usado por "Mi cuenta" > Vincular para distinguir "guardado" (hay canal
 * guardado) de "conectado al LIVE" (ese canal esta activo ahora mismo en
 * Chat) -- son dos estados distintos, ver criterio de aceptacion de
 * diferenciar cuentas guardadas/conectadas. Un solo fetch para las 4
 * plataformas en vez de uno por conector.
 */
export async function obtenerCanalesEnVivo() {
  try {
    const res = await fetch('/api/channels');
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    return {};
  }
}

export function canalEnColeccion(platform, channel, channels) {
  return (channels?.[platform] || []).some((ch) => normalizeChannelEntry(platform, ch)?.channel === channel);
}

/**
 * Usado por "Mi cuenta" > Vincular para tiktok/youtube (sin OAuth: se
 * conectan por nombre de canal, ver nota de arriba en normalizeChannelEntry).
 * Solo GUARDA -- nunca conecta al LIVE de una. La conexion real queda para
 * "Conectar"/"Conectar todo" en Chat (criterio explicito: guardar la cuenta
 * no puede disparar una conexion en vivo por si sola).
 */
export async function guardarCanal(platform, valorCrudo) {
  const entry = normalizeChannelEntry(platform, valorCrudo);
  if (!entry) return { ok: false };
  replaceSavedChannel(platform, entry);
  renderSettingsChannels();
  return { ok: true, channel: entry.channel, autoConnect: entry.autoConnect };
}

/**
 * Twitch/Kick se vinculan por OAuth (seccion-vincular.js#conectarOAuth), no
 * por nombre de canal -- pero para que "Conectar"/los iconos de Chat los vean
 * igual que tiktok/youtube, hace falta un canal guardado. Nadie vincularia
 * por OAuth la cuenta de OTRO streamer, asi que el username que devuelve el
 * OAuth es siempre el canal correcto a usar. Llamarlo tambien al desvincular
 * (username=null) limpia el canal guardado y refresca Chat al toque.
 */
export async function sincronizarCanalOAuth(platform, username) {
  if (!username) { await removeChannel(platform); return; }
  const entry = normalizeChannelEntry(platform, username);
  if (!entry) return;
  replaceSavedChannel(platform, entry);
  renderSettingsChannels();
}

// Modal "Mi cuenta" > Vincular; sin sesion, a la vista de cuenta (igual que el popover).
export function abrirVincularCuentas() {
  if (almacenSesion.getState().signedIn) window.abrirModalCuenta('vincular');
  else switchView('cuenta');
}

export function iniciarHoverConnectAllChat() {
  const chatBtn = document.getElementById('btn-connect-all-chat');
  if (!chatBtn) return;
  chatBtn.addEventListener('mouseenter', () => {
    if (chatBtn.disabled || !chatBtn.classList.contains('channels-connected')) return;
    chatBtn.textContent = t('btn.disconnectAll');
  });
  chatBtn.addEventListener('mouseleave', () => {
    if (chatBtn.disabled || !chatBtn.classList.contains('channels-connected')) return;
    chatBtn.textContent = t('btn.allConnected');
  });
}

// El nombre quedo del viejo panel "Canales vinculados" en Ajustes (ya
// removido, ahora vive en "Mi cuenta" > Vincular); se conserva porque sigue
// siendo el unico punto que refresca el estado de "Conectar todo" en Chat
// (updateChatConnectAllState) tras guardar/conectar/desconectar un canal.
export async function renderSettingsChannels() {
  const renderSeq = ++settingsChannelsRenderSeq;
  let channels = { tiktok: [], twitch: [], youtube: [], kick: [] };
  try {
    const res = await fetch('/api/channels');
    if (res.ok) channels = await res.json();
  } catch (e) { /* noop */ }
  if (renderSeq !== settingsChannelsRenderSeq) return;
  updateChatConnectAllState(channels);
}
