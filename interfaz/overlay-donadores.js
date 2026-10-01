import { iniciarRanking } from './compartido/iniciar-ranking.js';
import { ESQUEMAS } from './compartido/estilo/esquemas.js';
import { MONEDA_SVG } from './compartido/leaderboard-iconos.js';

iniciarRanking({
  esquema: ESQUEMAS.donadores,
  claveLista: 'topDonors',
  tipoMensajeWs: 'top-donors',
  campoValor: 'totalCoins',
  simboloHtml: MONEDA_SVG,
  claveTextoVacio: 'overlayStr.waitingDonors',
});
