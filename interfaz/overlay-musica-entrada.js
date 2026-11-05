import { esSkinEpik } from './compartido/epik/skin-epik.js';

// Con una skin .epik el diseno lo pone el archivo importado; si no, el overlay de siempre.
if (esSkinEpik(new URLSearchParams(location.search).get('skin'))) import('./compartido/epik/anfitrion-musica.js');
else import('./overlay-musica.js');
