'use strict';

// ─── Textos de anuncios del sistema (aviso de admin, promo) por idioma de
// voz ─────────────────────────────────────────────────────────────────────
// Estos anuncios los arma el backend y se transmiten a todos los clientes
// via ws:broadcast — no pasan por public/locales/*.json (eso es UI, esto es
// texto que lee el TTS). Se eligen segun `ttsVoiceLang` de config.json, el
// mismo idioma que ya elegiste para que la voz lea el chat.

const ADMIN_ANNOUNCE_TEXT = {
  'es-MX': 'Aviso del sistema: el creador de TikLive TTS acaba de ingresar.',
  en: 'System notice: the creator of TikLive TTS just joined.',
  'en-GB': 'System notice: the creator of TikLive TTS has just joined.',
  pt: 'Aviso do sistema: o criador do TikLive TTS acabou de entrar.',
  'pt-PT': 'Aviso do sistema: o criador do TikLive TTS acabou de entrar.',
  fr: "Avis système : le créateur de TikLive TTS vient d'arriver.",
  de: 'Systemhinweis: Der Entwickler von TikLive TTS ist gerade eingetreten.',
  it: 'Avviso di sistema: il creatore di TikLive TTS è appena entrato.',
  ja: 'システム通知：TikLive TTSの開発者がちょうど入室しました。',
  'zh-CN': '系统提示：TikLive TTS 的开发者刚刚进入了直播间。',
  ru: 'Системное уведомление: создатель TikLive TTS только что зашёл.',
  ko: '시스템 알림: TikLive TTS 제작자가 방금 입장했습니다.',
};

const PROMO_ANNOUNCE_TEXT = {
  'es-MX': '¿Haces stream y quieres una voz que lea el chat? Descarga TikLive TTS: tu live también puede sonar así.',
  en: 'Do you stream and want a voice reading your chat? Download TikLive TTS: your live can sound like this too.',
  'en-GB': 'Do you stream and want a voice reading your chat? Download TikLive TTS: your live can sound like this too.',
  pt: 'Você transmite e quer uma voz lendo o chat? Baixe o TikLive TTS: sua live também pode soar assim.',
  'pt-PT': 'Fazes streaming e queres uma voz a ler o chat? Descarrega o TikLive TTS: a tua live também pode soar assim.',
  fr: 'Vous streamez et voulez une voix qui lit le chat ? Téléchargez TikLive TTS : votre live peut sonner comme ça aussi.',
  de: 'Du streamst und willst eine Stimme, die den Chat vorliest? Lade TikLive TTS herunter: Dein Livestream kann auch so klingen.',
  it: 'Fai streaming e vuoi una voce che legga la chat? Scarica TikLive TTS: anche la tua diretta può suonare così.',
  ja: '配信でチャットを読み上げる声が欲しいですか？TikLive TTSをダウンロード：あなたの配信もこんな風に響きます。',
  'zh-CN': '你在直播，想要一个朗读聊天的声音吗？下载 TikLive TTS：你的直播也能这样。',
  ru: 'Стримишь и хочешь голос, который читает чат? Скачай TikLive TTS: твой стрим тоже может так звучать.',
  ko: '방송하면서 채팅 읽어주는 목소리를 원하시나요? TikLive TTS 다운로드: 당신의 방송도 이렇게 들릴 수 있어요.',
};

// `voiceId` es config.ttsVoiceLang (GOOGLE_TTS_LANGS en configuracion/default-config.js).
// Sin match exacto se prueba la lang base (`en-US` -> `en`, `es-ES` -> `es-MX`);
// sin nada, cae a 'es-MX' (default histórico de la app).
function pickAnnounceText(map, voiceId) {
  if (voiceId && map[voiceId]) return map[voiceId];
  const base = String(voiceId || '').split('-')[0];
  if (base && map[base]) return map[base];
  if (base === 'es') return map['es-MX'];
  return map[base] || map['es-MX'];
}

module.exports = { ADMIN_ANNOUNCE_TEXT, PROMO_ANNOUNCE_TEXT, pickAnnounceText };
