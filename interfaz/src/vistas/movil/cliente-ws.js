import { t } from '../../nucleo/i18n/i18n.js';
import { setStatus } from './status.js';
import { fetchState, applyState } from './estado.js';
import { addChat, addEvent } from './chat.js';
import {
  mDropPending, mClearPending, mRenderNowPlaying, mApplyMusicState, mFetchQueue, mAddPending, mSetEngineStatus, mSetVolUI,
} from './bot-musica.js';

let ws = null;
let wsRetry = 0;

/** WS propio de esta vista (13 tipos), independiente del de index.html —
 * ver nucleo/ws/cliente-ws.js para el de la app principal. */
export function connectWS() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}`);

  ws.onopen = () => {
    wsRetry = 0;
    setStatus('online', t('mobile3.connected'));
    fetchState();
  };
  ws.onmessage = (e) => {
    try { dispatch(JSON.parse(e.data)); } catch (_) { /* mensaje no-JSON, ignorar */ }
  };
  ws.onclose = () => {
    ws = null;
    setStatus('error', t('mobile3.disconnected'));
    wsRetry++;
    setTimeout(connectWS, Math.min(500 * Math.pow(1.5, wsRetry), 15000));
  };
  ws.onerror = () => ws.close();
}

function dispatch(d) {
  switch (d.type) {
    case 'chat':
      addChat(d);
      break;
    case 'gift':
      addEvent(d, '🎁', `${t('mobile3.sent')} ${d.giftName || t('mobile3.aGift')}${d.repeatCount > 1 ? ' ×' + d.repeatCount : ''}`);
      break;
    case 'follow':
      addEvent(d, '❤️', t('mobile3.followed'));
      break;
    case 'like':
      addEvent(d, '👍', `${t('mobile3.gave')} ${d.likeCount || 1} like${d.likeCount > 1 ? 's' : ''}`);
      break;
    case 'share':
      addEvent(d, '🔁', t('mobile3.sharedStream'));
      break;
    case 'join':
      addEvent(d, '👋', t('mobile3.joined'));
      break;
    case 'state-sync':
      if (d.state) applyState(d.state);
      break;
    case 'music-now-playing':
      mDropPending(d.requestId);
      mRenderNowPlaying(d.track);
      break;
    case 'music-idle':
      mClearPending();
      mRenderNowPlaying(null);
      break;
    case 'music-skip':
      mRenderNowPlaying(null);
      break;
    case 'music-state':
      mApplyMusicState(d);
      break;
    case 'music-queued':
      mDropPending(d.requestId);
      mFetchQueue();
      break;
    case 'music-request-pending':
      mAddPending(d.requestId, d.user, d.query);
      break;
    case 'music-request-failed':
      mDropPending(d.requestId);
      mFetchQueue();
      break;
    case 'music-engine':
      mSetEngineStatus(d.status);
      break;
    case 'music-volume':
      if (typeof d.volume === 'number') mSetVolUI(d.volume);
      break;
  }
}
