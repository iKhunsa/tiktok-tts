'use strict';

// advanced.html es puramente front — sin endpoints propios mas alla de los
// ya cubiertos por /configuracion y /moderacion (palabras bloqueadas). Este
// dominio existe para dejar un lugar donde crecer sin acoplar UI avanzada a
// otros dominios.
const { FEATURES } = require('./feature-flags');
const { ACCESIBILIDAD_KEYS } = require('./accesibilidad');

module.exports = {
  name: 'avanzado',

  register() {
    return { rutas: 0, listeners: 0 };
  },

  FEATURES,
  ACCESIBILIDAD_KEYS,
};
