'use strict';

// mqdefault (320x180) existe para todo video y es 16:9 limpio. hqdefault/sddefault
// son 4:3 con franjas negras horneadas (no se quitan con object-fit), y
// maxresdefault/hq720 no existen para todos.
const youtubeThumbnail = (videoId) => (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : '');

module.exports = { youtubeThumbnail };
