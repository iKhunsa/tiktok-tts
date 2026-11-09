import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { sincronizarCamposOverlay } from '../campos-overlay/sincronizar.js';

const ESCALA_MIN = 0.1; // los limites del campo `escala` del esquema
const ESCALA_MAX = 2;

/**
 * Cuatro tiradores en las esquinas del marco de seleccion: arrastrar uno cambia el campo `escala`
 * (Tamano total) del overlay seleccionado, con la esquina opuesta como ancla. El overlay crece en vivo:
 * los de diseno fijo escalan con --zoom y el resto con --escala, que se mueven dentro de su iframe.
 * Al soltar se guarda el valor; `alConfirmar` avisa para que el editor no recargue lo que ya se ve igual.
 */
export function iniciarTiradores(resalte, { idSeleccionado, iframeDe, alMover, alConfirmar }) {
  for (const esquina of ['nw', 'ne', 'sw', 'se']) {
    const tirador = document.createElement('span');
    tirador.className = 'edi-tirador';
    tirador.dataset.esquina = esquina;
    let gesto = null;
    tirador.addEventListener('pointerdown', (evento) => {
      const id = idSeleccionado();
      if (evento.button !== 0 || !id) return;
      evento.preventDefault();
      evento.stopPropagation();
      tirador.setPointerCapture(evento.pointerId);
      const caja = resalte.getBoundingClientRect();
      const ancla = { x: esquina.includes('w') ? caja.right : caja.left, y: esquina.includes('n') ? caja.bottom : caja.top };
      const raiz = iframeDe(id).contentDocument.documentElement.style;
      const zoom = parseFloat(raiz.getPropertyValue('--zoom'));
      gesto = { id, caja, ancla, raiz, zoom, escala: appSettings.overlays[id].escala, factor: 1, cuadro: 0 };
    });
    tirador.addEventListener('pointermove', (evento) => {
      if (!gesto) return;
      const { caja, ancla, raiz, zoom, escala } = gesto;
      const pedido = Math.max(Math.abs(evento.clientX - ancla.x) / caja.width, Math.abs(evento.clientY - ancla.y) / caja.height);
      gesto.factor = Math.min(ESCALA_MAX / escala, Math.max(ESCALA_MIN / escala, pedido));
      if (Number.isFinite(zoom)) raiz.setProperty('--zoom', String(zoom * gesto.factor));
      else raiz.setProperty('--escala', String(escala * gesto.factor));
      // Un repintado del marco por cuadro basta: se mide el overlay ya escalado.
      cancelAnimationFrame(gesto.cuadro);
      gesto.cuadro = requestAnimationFrame(alMover);
    });
    const soltar = () => {
      if (!gesto) return;
      const { id, escala, factor } = gesto;
      gesto = null;
      appSettings.overlays[id].escala = Math.round(escala * factor * 100) / 100;
      saveSettings();
      alConfirmar(id);
      updateOverlayUrl(id);
      sincronizarCamposOverlay(id);
    };
    tirador.addEventListener('pointerup', soltar);
    tirador.addEventListener('pointercancel', soltar);
    resalte.append(tirador);
  }
}
