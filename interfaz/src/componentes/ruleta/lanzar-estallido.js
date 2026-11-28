const PIEZAS = 30;
const COLORES = ['#f0213a', '#fafafa', '#ff7384'];
const ANCHO_DISENO = 320; // ancho del centro en unidades del diseno

/** Confeti que sale del premio al ganar; cada pieza se borra sola al terminar. */
export function lanzarEstallido(centro) {
  const unidad = centro.clientWidth / ANCHO_DISENO;
  for (let i = 0; i < PIEZAS; i++) {
    const pieza = document.createElement('span');
    pieza.className = 'ruleta-confeti';
    pieza.style.background = COLORES[i % COLORES.length];
    const direccion = ((i + Math.random() * 0.6) / PIEZAS) * Math.PI * 2;
    const alcance = (150 + Math.random() * 130) * unidad;
    const x = Math.cos(direccion) * alcance;
    const y = Math.sin(direccion) * alcance * 0.75;
    const giro = (Math.random() - 0.5) * 720;
    centro.append(pieza);
    pieza.animate([
      { transform: 'translate(0, 0) rotate(0deg) scale(0.6)', opacity: 1 },
      { transform: `translate(${x}px, ${y}px) rotate(${giro * 0.7}deg) scale(1)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${x * 1.08}px, ${y + 70 * unidad}px) rotate(${giro}deg) scale(0.7)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' })
      .onfinish = () => pieza.remove();
  }
}
