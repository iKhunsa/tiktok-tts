'use strict';

// Reexpone los validators de a11y* ya definidos en /configuracion (Fase 2) —
// este dominio no duplica el store, solo documenta cuales son.
const ACCESIBILIDAD_KEYS = ['a11yReduceMotion', 'a11yUiFontScale', 'a11yHighContrast'];

module.exports = { ACCESIBILIDAD_KEYS };
