/**
 * Cliente WS unico de index.html (36 tipos entrantes + state-sync
 * saliente). Es el hub de eventos de toda la app — legitimamente importa
 * de casi todas las vistas, igual que core/broadcast.js en el backend es
 * el unico traductor bus->WS. Portado 1:1 desde la seccion WEBSOCKET +
 * CHAT HANDLER de index.html, sin refactor de logica.
 */
import { t } from '../i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { logStorage } from '../log-storage.js';
import { appSettings, saveSettings } from '../estado/ajustes-app.js';
import { options } from '../estado/opciones-lectura.js';
import { applyA11yConfig, applyReadNonFollowers, applyFiltroIdiomaConfig } from '../estado/config-runtime.js';
import {
  ttsPaused, setTtsGlobalEnabled, togglePauseTts, skipCurrentTTS,
  clearTTSQueue, enableEmergencyTTSMode, sendStateSync, speak,
} from '../tts/cola-tts.js';
import { incrementarMsgCount, handleChatData, addSystemMsg } from '../../vistas/principal/chat-ui.js';
import { setStatus, getSayUsernameConnector } from '../../vistas/principal/modales-avisos.js';
import { updateOAuthStatusUI, loadOAuthStatusUI } from '../../vistas/principal/oauth-twitch.js';
import { updateFollowerDisplay } from '../../vistas/principal/configurador-overlays.js';
import { renderSettingsChannels } from '../../vistas/principal/plataformas.js';
import { updateOBSStatus, getClipsData, getLocalDateStr, deleteClip, startStreamManual, markClip, obtenerStreamStartTime } from '../../vistas/principal/clips.js';
import { setSoloChatMode } from '../../vistas/principal/toggles-chat.js';
import { spPlaySound } from '../../vistas/principal/soundpad.js';
import { updateConnectorChipState } from '../../vistas/principal/voces.js';
import {
  musicPending, musicDropPending, musicRenderQueue, setMusicQueue, musicOnNowPlaying,
  musicStop, musicOnIdle, musicOnStateSync, setMusicVol, getMusicAudio, musicOnPlaylistUpdate,
  musicOnEngineStatus,
} from '../../vistas/principal/bot-musica.js';
import { modOnViewerUpdated } from '../../vistas/principal/moderacion.js';

export const LIKE_COOLDOWN_MS = 15 * 60 * 1000;
export const likeCooldownMap = new Map();

let ws = null;
let wsReconnectAttempts = 0;
const MAX_WS_RECONNECT = 20;

export function getWs() { return ws; }

export function connectWS() {
  if (ws !== null && ws.readyState === WebSocket.OPEN) return;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}`);
  ws.onmessage = (e) => {
    let d;
    try {
      d = JSON.parse(e.data);
    } catch (err) {
      logStorage.addLog('warn', 'ws', 'mensaje WS no parseable');
      return;
    }
    try {
      handleMessage(d);
    } catch (err) {
      logStorage.addLog('warn', 'ws', `error procesando mensaje WS: ${err.message}`);
    }
  };
  ws.onopen = () => { wsReconnectAttempts = 0; setTimeout(sendStateSync, 200); };
  ws.onclose = () => {
    ws = null;
    wsReconnectAttempts++;
    if (wsReconnectAttempts >= MAX_WS_RECONNECT) {
      setStatus('error', t('conn.connectionLost'));
      return;
    }
    const delay = Math.min(2000 * Math.pow(2, wsReconnectAttempts), 30000);
    setTimeout(connectWS, delay);
  };
  ws.onerror = () => ws.close();
}

function handleMessage(data) {
  switch (data.type) {
    case 'connected':
      setStatus('online', t('status.connectedAs', { username: data.username }));
      logStorage.addLog('info', 'server', `Conectado a @${data.username}`);
      break;

    case 'disconnected':
      setStatus('', t('status.disconnected'));
      logStorage.addLog('info', 'server', 'Desconectado');
      break;

    case 'chat': {
      const n = incrementarMsgCount();
      document.getElementById('msgCount').textContent = n;
      handleChatData(data, `msg-${n}`);
      break;
    }

    case 'admin-announce': {
      const n = incrementarMsgCount();
      document.getElementById('msgCount').textContent = n;
      const adminMsgId = `msg-${n}`;
      const voiceSelect = document.getElementById('voiceSelect');
      const adminTxt = (data.texts && data.texts[voiceSelect?.value]) || data.text;
      addSystemMsg(adminTxt, 'admin', adminMsgId, { iconSrc: 'icons/check_circle.svg' });
      speak(adminTxt, adminMsgId, data.timestamp);
      break;
    }

    case 'promo-announce': {
      const n = incrementarMsgCount();
      document.getElementById('msgCount').textContent = n;
      const promoMsgId = `msg-${n}`;
      const voiceSelect = document.getElementById('voiceSelect');
      const promoTxt = (data.texts && data.texts[voiceSelect?.value]) || data.text;
      addSystemMsg(promoTxt, 'promo', promoMsgId, { iconSrc: 'icons/flash_on.svg' });
      speak(promoTxt, promoMsgId, data.timestamp);
      break;
    }

    case 'gift':
      if (options.readGifts) {
        const n = incrementarMsgCount();
        document.getElementById('msgCount').textContent = n;
        const giftId = `msg-${n}`;
        const giftVars = { user: data.user, count: data.repeatCount, gift: data.giftName, amount: data.usdValue };
        const giftText = (options.readGiftAmount && data.usdValue) ? t('announce.giftUsd', giftVars) : t('announce.gift', giftVars);
        addSystemMsg(t('announce.gift', giftVars), 'gift', giftId, {
          iconSrc: 'icons/card_giftcard.svg',
          accentText: data.usdValue ? `≈ $${data.usdValue} USD` : '',
        });
        speak(giftText, giftId, data.timestamp);
      }
      break;

    case 'join':
      if (options.readJoins) {
        const n = incrementarMsgCount();
        document.getElementById('msgCount').textContent = n;
        const joinId = `msg-${n}`;
        const joinText = t('announce.join', { user: data.user });
        addSystemMsg(joinText, 'join', joinId, { iconSrc: 'icons/emoji_people.svg' });
        speak(joinText, joinId, data.timestamp);
      }
      break;

    case 'follow': {
      const isTwitchFollow = data.platform === 'twitch';
      const followEnabled = isTwitchFollow ? options.readTwitchFollow : options.readFollows;
      if (followEnabled) {
        const n = incrementarMsgCount();
        document.getElementById('msgCount').textContent = n;
        const followId = `msg-${n}`;
        const followText = isTwitchFollow ? t('announce.followTwitch', { user: data.user }) : t('announce.follow', { user: data.user });
        addSystemMsg(followText, 'join', followId, { iconSrc: 'icons/person_add.svg' });
        speak(followText, followId, data.timestamp);
      }
      break;
    }

    case 'sub': {
      if (options.readTwitchSub) {
        const n = incrementarMsgCount();
        document.getElementById('msgCount').textContent = n;
        const subId = `msg-${n}`;
        const subVars = { user: data.user, months: data.months || 0, recipient: data.recipient, count: data.giftCount };
        let subText;
        if (data.subType === 'resub') subText = t('announce.subResub', subVars);
        else if (data.subType === 'gift') subText = t('announce.subGift', subVars);
        else if (data.subType === 'mysterygift') subText = t('announce.subMysteryGift', subVars);
        else if (data.subType === 'upgrade') subText = t('announce.subUpgrade', subVars);
        else subText = t('announce.subNew', subVars);
        addSystemMsg(subText, 'gift', subId, { iconSrc: 'icons/card_giftcard.svg' });
        speak(subText, subId, data.timestamp);
      }
      break;
    }

    case 'cheer':
      if (options.readTwitchCheer) {
        const n = incrementarMsgCount();
        document.getElementById('msgCount').textContent = n;
        const cheerId = `msg-${n}`;
        const cheerText = t('announce.cheer', { user: data.user, bits: data.bits });
        addSystemMsg(cheerText, 'gift', cheerId, { iconSrc: 'icons/card_giftcard.svg' });
        speak(cheerText, cheerId, data.timestamp);
      }
      break;

    case 'raid':
      if (options.readTwitchRaid) {
        const n = incrementarMsgCount();
        document.getElementById('msgCount').textContent = n;
        const raidId = `msg-${n}`;
        const raidText = t('announce.raid', { user: data.user, viewers: data.viewers });
        addSystemMsg(raidText, 'join', raidId, { iconSrc: 'icons/emoji_people.svg' });
        speak(raidText, raidId, data.timestamp);
      }
      break;

    case 'oauth-status-changed':
      updateOAuthStatusUI(data);
      break;

    case 'like':
      if (options.readLikes) {
        const now = Date.now();
        const last = likeCooldownMap.get(data.user) || 0;
        if (now - last >= LIKE_COOLDOWN_MS) {
          likeCooldownMap.set(data.user, now);
          const n = incrementarMsgCount();
          document.getElementById('msgCount').textContent = n;
          const likeId = `msg-${n}`;
          const likeText = t('announce.like', { user: data.user, count: data.likeCount });
          addSystemMsg(likeText, 'join', likeId, { iconSrc: 'icons/thumb_up.svg' });
          speak(likeText, likeId, data.timestamp);
        }
      }
      break;

    case 'share':
      if (options.readShares) {
        const n = incrementarMsgCount();
        document.getElementById('msgCount').textContent = n;
        const shareId = `msg-${n}`;
        const shareText = t('announce.share', { user: data.user });
        addSystemMsg(shareText, 'join', shareId, { iconSrc: 'icons/public.svg' });
        speak(shareText, shareId, data.timestamp);
      }
      break;

    case 'reconnecting':
      setStatus('error', 'Reconectando... (intento ' + data.attempt + ')');
      logStorage.addLog('warn', 'server', `Reconexión intento ${data.attempt}`);
      break;

    case 'follower-base':
      updateFollowerDisplay(data.count);
      break;

    case 'error':
      setStatus('error', data.message);
      logStorage.addLog('error', 'server', data.message);
      break;

    case 'twitch-auth-ready':
      showToast(data.login ? t('toast.twitchAuthAs').replace('{login}', data.login) : t('toast.twitchAuth'));
      break;

    case 'twitch-auth-error':
      showToast(data.error || t('toast.twitchAuthError'));
      loadOAuthStatusUI();
      break;

    case 'platform-connected':
      renderSettingsChannels();
      showToast(t('toast.platformConnected').replace('{platform}', data.platform.charAt(0).toUpperCase() + data.platform.slice(1)));
      break;

    case 'platform-disconnected':
      renderSettingsChannels();
      break;

    case 'obs-connected':
      updateOBSStatus(true);
      { const btn = document.getElementById('btnConnectOBS'); const btnDis = document.getElementById('btnDisconnectOBS');
        if (btn) btn.style.display = 'none'; if (btnDis) btnDis.style.display = 'inline-block'; }
      break;

    case 'obs-disconnected':
      updateOBSStatus(false);
      { const btn = document.getElementById('btnConnectOBS'); const btnDis = document.getElementById('btnDisconnectOBS');
        if (btn) btn.style.display = 'inline-block'; if (btnDis) btnDis.style.display = 'none'; }
      break;

    case 'obs-reconnecting':
      showToast(t('toast.obsReconnecting').replace('{attempt}', data.attempt));
      break;

    case 'obs-stream-started':
      if (!obtenerStreamStartTime()) startStreamManual();
      showToast(t('toast.obsStreamStart'));
      break;

    case 'obs-stream-stopped':
      showToast(t('toast.obsStreamStop'));
      break;

    case 'remote-cmd':
      if (data.action === 'toggle' && data.key) {
        options[data.key] = !!data.value;
        appSettings[data.key] = !!data.value;
        const chipId = { readChat: 'chip-chat', readGifts: 'chip-gifts', readGiftAmount: 'chip-gift-amount', readJoins: 'chip-joins', readFollows: 'chip-follows', readLikes: 'chip-likes', readShares: 'chip-shares', sayUsername: 'chip-username' }[data.key];
        if (chipId) {
          const chip = document.getElementById(chipId);
          if (chip) { const cb = chip.querySelector('input[type=checkbox]'); if (cb) cb.checked = !!data.value; chip.classList.toggle('active', !!data.value); }
        }
        if (data.key === 'sayUsername') updateConnectorChipState();
        saveSettings();
      } else if (data.action === 'globalTTS') {
        setTtsGlobalEnabled(data.value);
      } else if (data.action === 'pause') {
        if (ttsPaused !== !!data.value) togglePauseTts();
      } else if (data.action === 'skip') {
        skipCurrentTTS();
      } else if (data.action === 'clear') {
        clearTTSQueue();
      } else if (data.action === 'emergency') {
        enableEmergencyTTSMode();
      } else if (data.action === 'markClip') {
        markClip();
      } else if (data.action === 'deleteClip' && (data.clipId != null || data.index != null)) {
        const clipsData = getClipsData();
        const today = getLocalDateStr();
        const dayClips = clipsData[today] || [];
        if (data.clipId != null) {
          const entry = dayClips.find((e) => String(e.id) === String(data.clipId));
          if (entry) deleteClip(today, entry.id);
        } else {
          const entry = dayClips[data.index];
          if (entry) deleteClip(today, entry.id);
        }
      } else if (data.action === 'soloChat') {
        setSoloChatMode();
      } else if (data.action === 'soundpadPlay' && data.soundId) {
        spPlaySound(data.soundId);
      }
      sendStateSync();
      break;

    case 'music-request-pending':
      if (data.requestId && !musicPending.some((p) => p.id === data.requestId)) {
        musicPending.push({ id: data.requestId, user: data.user, query: data.query, ts: Date.now() });
        musicRenderQueue();
        showToast(t('toast.musicRequestReceived', { user: data.user || '' }));
      }
      break;
    case 'music-request-failed':
      musicDropPending(data.requestId);
      musicRenderQueue();
      showToast(t('toast.musicRequestFailed', { query: data.query || '' }));
      break;
    case 'music-now-playing':
      musicDropPending(data.requestId);
      if (Array.isArray(data.queue)) setMusicQueue(data.queue);
      musicRenderQueue();
      musicOnNowPlaying(data.track);
      break;
    case 'music-queued':
      musicDropPending(data.requestId);
      if (Array.isArray(data.queue)) setMusicQueue(data.queue);
      musicRenderQueue();
      break;
    case 'music-skip':
      // Solo detener audio local: el servidor ya avanza la cola y emite
      // music-now-playing / music-idle (evita N avances con N clientes).
      musicStop();
      break;
    case 'music-idle':
      musicOnIdle();
      break;
    case 'music-state':
      musicOnStateSync(data);
      break;
    case 'music-volume':
      if (typeof data.volume === 'number') {
        setMusicVol(data.volume);
        const vr = document.getElementById('musicVolRange');
        const vv = document.getElementById('musicVolVal');
        if (vr) vr.value = data.volume;
        if (vv) vv.textContent = Math.round(data.volume * 100) + '%';
        if (getMusicAudio()) getMusicAudio().volume = data.volume;
      }
      break;
    case 'music-playlist-update':
      musicOnPlaylistUpdate(data);
      break;
    case 'music-engine':
      musicOnEngineStatus(data.status);
      break;
    case 'config-updated':
      applyA11yConfig(data.config || {});
      applyReadNonFollowers(data.config || {});
      applyFiltroIdiomaConfig(data.config || {});
      break;
    case 'moderation-updated':
    case 'moderation-reset':
      modOnViewerUpdated();
      break;
    case 'play-soundpad':
      if (data.soundId) spPlaySound(data.soundId);
      break;
  }
}
