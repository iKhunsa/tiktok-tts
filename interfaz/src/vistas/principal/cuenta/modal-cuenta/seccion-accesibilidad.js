/**
 * Seccion "Accesibilidad" del modal "Mi cuenta". Mismos ajustes que tenia el
 * panel de advanced.html (a11yUiFontScale, a11yReduceMotion, ttsSlowSpeech,
 * a11yHighContrast en /api/config), aplicados al instante.
 */
import { t, tErr, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { applyA11yConfig } from '../../../../nucleo/estado/config-runtime.js';
import { showToast } from '../../../../componentes/toast.js';

const ESCALAS = [[1, 'sizeNormal'], [1.15, 'sizeMedium'], [1.3, 'sizeLarge'], [1.5, 'sizeXL']];
const INTERRUPTORES = [
  ['a11yReduceMotion', 'adv.a11yReduceMotion'],
  ['ttsSlowSpeech', 'adv.a11ySlowSpeech'],
  ['a11yHighContrast', 'adv.a11yHighContrast'],
];

export function pintarAccesibilidad(cont) {
  cont.insertAdjacentHTML('beforeend', `
    <div class="mc-a11y-fila">
      <div>
        <div class="mc-a11y-nombre" id="mcTamanoTitulo" data-i18n="cuentaModal.textSize"></div>
        <p class="mc-bloque-desc" data-i18n="cuentaModal.textSizeHint"></p>
      </div>
      <div class="mc-tamanos" role="radiogroup" aria-labelledby="mcTamanoTitulo">
        ${ESCALAS.map(([v, k]) => `<button class="mc-tamano" type="button" role="radio" aria-checked="false" data-escala="${v}" data-i18n="cuentaModal.${k}"></button>`).join('')}
      </div>
    </div>
    <h3 class="mc-bloque-titulo mc-a11y-grupo" data-i18n="cuentaModal.notifications"></h3>
    ${INTERRUPTORES.map(([clave, k]) => `
    <label class="mc-a11y-fila">
      <div>
        <div class="mc-a11y-nombre" data-i18n="${k}Name"></div>
        <p class="mc-bloque-desc" data-i18n="${k}Hint"></p>
      </div>
      <span class="switch"><input type="checkbox" data-clave="${clave}"><span class="switch-track"></span></span>
    </label>`).join('')}`);
  aplicarTraducciones(cont);

  let cfg = {};
  const pintarEstado = () => {
    const escala = Number(cfg.a11yUiFontScale ?? 1);
    cont.querySelectorAll('.mc-tamano').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.escala) === escala)));
    cont.querySelectorAll('[data-clave]').forEach((i) => { i.checked = !!cfg[i.dataset.clave]; });
  };
  const cargar = () => fetch('/api/config').then((r) => r.json()).then((c) => {
    cfg = c;
    applyA11yConfig(cfg);
    pintarEstado();
  }).catch(() => showToast(t('adv.errorLoadConfig')));

  async function guardar(cambio) {
    Object.assign(cfg, cambio);
    applyA11yConfig(cfg);
    pintarEstado();
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambio),
      });
      if (!res.ok) throw new Error(tErr(await res.json().catch(() => ({})), 'adv.configRejected'));
    } catch (e) {
      showToast(e.message || t('adv.configRejected'));
      cargar();
    }
  }

  cont.querySelector('.mc-tamanos').addEventListener('click', (e) => {
    const b = e.target.closest('.mc-tamano');
    if (b) guardar({ a11yUiFontScale: Number(b.dataset.escala) });
  });
  cont.addEventListener('change', (e) => {
    const clave = e.target.dataset?.clave;
    if (clave) guardar({ [clave]: e.target.checked });
  });
  cargar();
}
