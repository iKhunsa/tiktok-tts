import { iniciarRanking } from './compartido/iniciar-ranking.js';
import { ESQUEMAS } from './compartido/estilo/esquemas.js';
import { CORAZON_SVG } from './compartido/leaderboard-iconos.js';
import { MUESTRA_LIKES } from './compartido/muestras-vista-previa.js';

iniciarRanking({
  esquema: ESQUEMAS.likes,
  claveLista: 'topLikers',
  tipoMensajeWs: 'top-likers',
  campoValor: 'totalLikes',
  simboloHtml: CORAZON_SVG,
  claveTextoVacio: 'overlayStr.waitingLikes',
  muestra: MUESTRA_LIKES,
});
