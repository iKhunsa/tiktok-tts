'use strict';

// Agrupa un conteo en un rango legible para analytics (baja cardinalidad).
// Se usa en aptabase.js para no mandar números crudos.
//
//   bucket(0,   [1,10,50,200]) -> '0'
//   bucket(1,   [1,10,50,200]) -> '1'
//   bucket(3,   [1,10,50,200]) -> '1-10'
//   bucket(50,  [1,10,50,200]) -> '11-50'
//   bucket(999, [1,10,50,200]) -> '201+'

function bucket(n, bounds) {
  const v = Number(n) || 0;
  if (v <= 0) return '0';
  let lo = 1;
  for (const b of bounds) {
    if (v <= b) return lo === b ? String(b) : `${lo}-${b}`;
    lo = b + 1;
  }
  return `${bounds[bounds.length - 1] + 1}+`;
}

module.exports = { bucket };
