'use strict';

// advanced.html es puramente front — sin endpoints propios mas alla de los
// ya cubiertos por /configuracion y /moderacion. Este dominio queda como
// lugar donde crecer sin acoplar la UI avanzada a otros dominios.
module.exports = {
  name: 'avanzado',

  register() {
    return { rutas: 0, listeners: 0 };
  },
};
