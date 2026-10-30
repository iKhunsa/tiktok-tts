const TEXTO = { izquierda: 'left', centro: 'center', derecha: 'right', justificado: 'justify' };
const EJE = { izquierda: 'flex-start', arriba: 'flex-start', centro: 'center', derecha: 'flex-end', abajo: 'flex-end' };
const EJE_RTL = { ...EJE, izquierda: 'flex-end', derecha: 'flex-start' }; // dentro de un contenedor rtl, flex-start es la derecha

/** Publica la alineacion del overlay como variables CSS (--txt-align, --pos-y, --pos-msg, --dx, --dy). */
export function aplicarAlineacion(cfg) {
  const raiz = document.documentElement.style;
  raiz.setProperty('--txt-align', TEXTO[cfg.alineacionTexto]);
  raiz.setProperty('--pos-y', EJE[cfg.posicionV]);
  raiz.setProperty('--dx', `${cfg.desplazaX * 100}vw`);
  raiz.setProperty('--dy', `${cfg.desplazaY * 100}vh`);
  raiz.setProperty('--pos-msg', (cfg.derechaAIzquierda ? EJE_RTL : EJE)[cfg.posicionH]);
}
