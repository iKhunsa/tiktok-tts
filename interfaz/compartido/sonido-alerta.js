const numero = (valor, defecto) => (Number.isFinite(valor) ? valor : defecto);

// Ecualizador basico: graves (hasta 200 Hz), medios (alrededor de 1 kHz) y agudos (desde 4 kHz), cada uno de -12 a +12 dB.
const BANDAS = [['lowshelf', 200, 'sonidoGraves'], ['peaking', 1000, 'sonidoMedios'], ['highshelf', 4000, 'sonidoAgudos']];

/**
 * Prepara el audio de la alerta con los ajustes del editor de canvas (params `snd`, `sv`, `st`, `sg`, `sm` y `sa`):
 * volumen 0-100, tono en semitonos (-12 a +12, sube o baja tambien la velocidad, como un disco) y el ecualizador. Solo
 * direcciones http(s). El editor lo usa para oir la prueba y el overlay para la alerta real, asi suenan igual.
 * El ecualizador pasa el audio por Web Audio solo si alguna banda esta tocada; si no, suena directo.
 */
export function crearAudioAlerta(src, cfg = {}) {
  if (typeof src !== 'string' || !/^https?:\/\//i.test(src)) return null;
  const audio = new Audio();
  const volumen = Math.min(1, Math.max(0, numero(cfg.sonidoVolumen, 100) / 100));
  const tono = numero(cfg.sonidoTono, 0);
  const bandas = BANDAS.map(([tipo, frecuencia, clave]) => ({ tipo, frecuencia, ganancia: numero(cfg[clave], 0) })).filter(({ ganancia }) => ganancia);
  audio.volume = volumen;
  if (tono) {
    audio.preservesPitch = false;
    // La velocidad por defecto tambien: al asignar src el navegador recarga el audio y vuelve a ella.
    audio.defaultPlaybackRate = audio.playbackRate = 2 ** (tono / 12);
  }
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (bandas.length && Contexto) {
    audio.crossOrigin = 'anonymous'; // sin esto, un audio de otro origen saldria en silencio por el filtro
    const contexto = new Contexto();
    let nodo = contexto.createMediaElementSource(audio);
    for (const { tipo, frecuencia, ganancia } of bandas) {
      const filtro = contexto.createBiquadFilter();
      Object.assign(filtro, { type: tipo });
      filtro.frequency.value = frecuencia;
      filtro.gain.value = ganancia;
      nodo.connect(filtro);
      nodo = filtro;
    }
    const nivel = contexto.createGain();
    nivel.gain.value = volumen;
    audio.volume = 1; // el volumen lo pone el nodo de ganancia
    nodo.connect(nivel).connect(contexto.destination);
    const cerrar = () => contexto.close().catch(() => {});
    audio.addEventListener('ended', cerrar, { once: true });
    audio.addEventListener('pause', cerrar, { once: true });
    contexto.resume().catch(() => {});
  }
  audio.src = src;
  return audio;
}

/**
 * Sonido elegido en el editor de canvas para la alerta: suena una vez cuando la alerta aparece. Si el navegador no
 * deja reproducir (politica de autoplay) simplemente no suena: la alerta se ve igual. En OBS siempre suena.
 */
export function reproducirSonidoAlerta(cfg) {
  crearAudioAlerta(cfg?.sonidoAlerta, cfg)?.play().catch(() => {});
}
