import { montarEscena, RECURSOS } from './escena.js';

const RUTA_AUDIO = 'audio/eventos/halloween';

// Volumenes pensados para acompanar, no tapar, al TTS y al stream: la colonia
// (-21 LUFS de origen) a 0.35 queda ~-30 LUFS; el ambiente (-30 LUFS de origen) a 0.6, ~-35 LUFS.
const SONIDOS = [
  { src: `${RUTA_AUDIO}/bats.mp3`, volumen: 0.35 },
  { src: `${RUTA_AUDIO}/ambience.mp3`, volumen: 0.6 },
];

export const halloween = {
  id: 'halloween',
  ventana: { desde: '10-01', hasta: '11-02' }, // MM-DD inclusive
  recursos: RECURSOS,
  sonidos: SONIDOS,
  duracionMs: 5000,
  montar: montarEscena,
};
