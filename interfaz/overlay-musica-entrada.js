import { elegirEntrada } from './compartido/epik/anfitrion.js';

elegirEntrada({
  nativo: () => import('./overlay-musica.js'),
  epik: () => import('./compartido/epik/anfitrion-musica.js'),
});
