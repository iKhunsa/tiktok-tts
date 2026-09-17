'use strict';

const WINDOW_MINUTES = 10;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

// ponytail: valores iniciales sin telemetría; recalibrar con actividad real si
// las promos siguen siendo demasiado frecuentes o escasas.
const BASE_MINUTES = 30;
const PISO_MINUTES = 10;
const TECHO_MINUTES = 90;
const MIN_FACTOR = 0.1;
const MAX_FACTOR = 5;

const timestamps = [];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function podar(now) {
  const cutoff = now - WINDOW_MS;
  while (timestamps.length && timestamps[0] < cutoff) timestamps.shift();
}

/** Registra cada chat porque los mensajes miden compromiso en todas las plataformas. */
function registrarMensaje() {
  const now = Date.now();
  podar(now);
  timestamps.push(now);
}

/** Devuelve una tasa estable, en vez del ultimo pico puntual del chat. */
function mensajesPorMinuto() {
  podar(Date.now());
  return timestamps.length / WINDOW_MINUTES;
}

function calcularIntervaloMinutos(mensajesPorMinuto) {
  const factor = clamp(mensajesPorMinuto, MIN_FACTOR, MAX_FACTOR);
  return clamp(BASE_MINUTES / factor, PISO_MINUTES, TECHO_MINUTES);
}

module.exports = { registrarMensaje, mensajesPorMinuto, calcularIntervaloMinutos };
