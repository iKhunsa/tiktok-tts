import { rutaSegmento } from './geometria.js';

// Radios en unidades del viewBox (el disco mide 1200x1200).
export const RADIO_INTERIOR = 408;
export const RADIO_EXTERIOR = 550;
const RADIO_ARTE = (RADIO_INTERIOR + RADIO_EXTERIOR) / 2;
const LADO_ARTE = 112;
const DIENTES = 84;

const tono = (premio, indice) => {
  if (premio.destacado) return 'url(#ruletaRojo)';
  return indice % 2 ? 'url(#ruletaOscuro)' : 'url(#ruletaClaro)';
};

const dibujarCasilla = (premio, indice, paso) => `<g transform="rotate(${indice * paso})">
  <path d="${rutaSegmento(RADIO_INTERIOR, RADIO_EXTERIOR, paso)}" fill="${tono(premio, indice)}" stroke="#171717" stroke-width="9" />
  <ellipse cx="0" cy="${-RADIO_ARTE + LADO_ARTE / 2}" rx="46" ry="9" fill="#171717" opacity="0.28" />
  <image href="${premio.icono}" x="${-LADO_ARTE / 2}" y="${-RADIO_ARTE - LADO_ARTE / 2}" width="${LADO_ARTE}" height="${LADO_ARTE}" />
</g>`;

const degradado = (id, interior, exterior) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${RADIO_EXTERIOR}">
  <stop offset="0.74" stop-color="${interior}" /><stop offset="0.93" stop-color="${exterior}" /></radialGradient>`;

/** SVG de la parte que gira: casillas, bordes gruesos y dientes exteriores. */
export function dibujarDisco(casillas) {
  const paso = 360 / casillas.length;
  return `<svg viewBox="-600 -600 1200 1200" aria-hidden="true">
    <defs>${degradado('ruletaClaro', '#c9c4c6', '#fafafa')}${degradado('ruletaOscuro', '#1f1f1f', '#3a3a3a')}${degradado('ruletaRojo', '#8f1022', '#f0213a')}</defs>
    <circle r="589" fill="none" stroke="#fafafa" stroke-opacity="0.2" stroke-width="22" pathLength="${DIENTES}" stroke-dasharray="0.56 0.44" />
    ${casillas.map((premio, indice) => dibujarCasilla(premio, indice, paso)).join('')}
    <circle r="565" fill="none" stroke="#171717" stroke-width="32" />
    <circle r="578" fill="none" stroke="#fafafa" stroke-opacity="0.12" stroke-width="3" />
    <circle r="552" fill="none" stroke="#f0213a" stroke-width="5" />
    <circle r="394" fill="none" stroke="#171717" stroke-width="32" />
    <circle r="406" fill="none" stroke="#f0213a" stroke-width="5" />
    <circle r="380" fill="none" stroke="#fafafa" stroke-opacity="0.14" stroke-width="3" />
  </svg>`;
}
