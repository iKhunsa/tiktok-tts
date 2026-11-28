import { abrirBancoMonedas } from './banco-monedas.js';
import { mostrarAviso } from './mostrar-aviso.js';
import { leerSaldo } from './saldo.js';

/** No alcanza: se dice cuanto cuesta, cuanto hay y las dos formas de conseguir mas. Por defecto habla de un giro. */
export function avisarSinMonedas(precio, texto = 'temporada.aviso.sinMonedasTexto') {
  mostrarAviso({
    titulo: 'temporada.aviso.sinMonedasTitulo',
    texto,
    vars: { precio, saldo: leerSaldo() },
    acciones: [
      { clave: 'temporada.aviso.conseguir', alPulsar: abrirBancoMonedas },
      { clave: 'temporada.aviso.verMisiones', alPulsar: () => document.getElementById('temporadaPestana-pase').click() },
      { clave: 'temporada.ahoraNo' },
    ],
  });
}
