'use strict';

// get_activity — feed reciente de eventos internos (log:entry de todos los
// dominios). Útil para que el agente entienda qué pasó sin leer el WS.

function getActivity({ activity }, args) {
  const limit = Number(args && args.limit) || 50;
  const level = args && args.level;
  return { events: activity.query({ limit, level }) };
}

module.exports = getActivity;
