'use strict';

// Foto de la configuracion al arrancar. Responde a "¿alguien usa el filtro de
// idioma?" sin necesidad de instrumentar cada interruptor.
//
// Solo booleanos y enumerados: nunca playlists, usuarios baneados ni nada que
// contenga texto del usuario.

function attach(bus, track) {
  bus.on('settings:snapshot', (config = {}) => {
    track('settings', 'snapshot', {
      tts_lang: config.ttsVoiceLang || null,
      tts_slow: !!config.ttsSlowSpeech,
      music_enabled: !!config.musicEnabled,
      playlist_enabled: !!config.playlistEnabled,
      rate_limit_enabled: !!config.rateLimitEnabled,
      lang_filter: !!config.langFilterEnabled,
      dict_filter: !!config.dictFilterEnabled,
      a11y_reduce_motion: !!config.a11yReduceMotion,
      a11y_high_contrast: !!config.a11yHighContrast,
      a11y_font_scale: Number(config.a11yUiFontScale) || 1,
      max_queue: Number(config.MAX_QUEUE_MSG) || null,
    });
  });
}

module.exports = { name: 'settings', attach };
