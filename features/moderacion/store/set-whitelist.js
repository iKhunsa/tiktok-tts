'use strict';

const { mutate } = require('./mutate');

function setWhitelist(state, target, value) {
  return mutate(state, target, (v) => {
    v.wl = !!value;
    // Quitar la marca manual no debe borrar un follow real ya registrado,
    // pero si sacarlo de la pestaña de seguidores si nunca lo fue.
    if (!value && v.folAt === 0) v.fol = false;
    if (value) v.fol = true;
  });
}

module.exports = { setWhitelist };
