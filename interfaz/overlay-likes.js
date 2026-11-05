import { iniciarRanking } from './compartido/iniciar-ranking.js';
import { RANKINGS } from './compartido/fuente-ranking.js';
import { ESQUEMAS } from './compartido/estilo/esquemas.js';
import { CORAZON_SVG } from './compartido/leaderboard-iconos.js';
import { elegirEntrada } from './compartido/epik/anfitrion.js';

const nativo = () => iniciarRanking({ ...RANKINGS.likes, esquema: ESQUEMAS.likes, simboloHtml: CORAZON_SVG });
elegirEntrada({ nativo, epik: () => import('./compartido/epik/anfitrion-ranking.js').then((m) => m.iniciar('likes', nativo)) });
