'use strict';

// Ranking descendente por `field` de los valores de un Map (topLikers/topDonors).
function rankTop(map, field, n = 10) {
  return [...map.values()].sort((a, b) => b[field] - a[field]).slice(0, n);
}

module.exports = { rankTop };
