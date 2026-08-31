/**
 * Helpers de binding de formulario compartidos por varias vistas (settings,
 * configurador de overlays, panel avanzado): pintar el relleno de un
 * <input type=range>, y setear value/checked por id sin reventar si el
 * elemento no existe en el DOM actual (la vista puede no estar montada).
 */
export function paintRangeFill(el) {
  if (!el || el.type !== 'range') return;
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max);
  const val = parseFloat(el.value);
  const span = (isFinite(max) ? max : 100) - min;
  const pct = span > 0 ? Math.max(0, Math.min(100, ((val - min) / span) * 100)) : 0;
  el.style.setProperty('--range-pct', pct + '%');
}

export function iniciarPintadoDeRangos() {
  document.addEventListener('input', (e) => {
    if (
      e.target instanceof HTMLInputElement &&
      e.target.type === 'range' &&
      (e.target.closest('.cfg-field') || e.target.id === 'rateRange' || e.target.id === 'volRange')
    ) {
      paintRangeFill(e.target);
    }
  });
}

export function setFieldVal(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) {
    el.value = val;
    if (el.type === 'range') paintRangeFill(el);
  }
}

export function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}
