const ENLACES_ES = Object.freeze({
  terminos: 'https://tiklivetts.es/terminos.html',
  privacidad: 'https://tiklivetts.es/privacidad.html',
});

const ENLACES_EN = Object.freeze({
  terminos: 'https://tiklivetts.es/en/terms.html',
  privacidad: 'https://tiklivetts.es/en/privacy.html',
});

export function enlacesLegales(idioma) {
  return idioma === 'es' ? ENLACES_ES : ENLACES_EN;
}
