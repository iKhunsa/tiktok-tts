import {
  MAX_TECLADO_KEYS, MAX_CUSTOM_PRESETS, MAX_PRESET_NAME_LEN, TECLADO_PRESETS, DEFAULT_TECLADO_KEYS,
  codigoDomAUniverso, siguienteAncho, presetActivo,
} from '../../../compartido/teclado-keys.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

// Mismo patron que un editor de layouts de teclado de verdad (keyboard-layout-editor.com):
// las 20 teclas de la grilla quedan limpias (solo la etiqueta) y los controles
// de una tecla (ancho, quitar) salen SOLO cuando esa tecla esta seleccionada,
// en una barra aparte — nunca 3 botones encima de cada una a la vez.
let keys = DEFAULT_TECLADO_KEYS;
let customPresets = [];
let selected = null; // key seleccionada: muestra su barra de edicion y arma el intercambio con la proxima que se clickee
let capturing = false; // esperando la tecla a agregar
let guardando = false; // formulario de "guardar como preset" visible

const ETIQUETA_PRESET = { default: 'presetDefault', wasd: 'presetWasd', esdf: 'presetEsdf', moba: 'presetMoba', fps: 'presetFps', mmo: 'presetMmo', rhythm: 'presetRhythm' };

const presetsCombinados = () => ({
  ...TECLADO_PRESETS,
  ...Object.fromEntries(customPresets.map((p) => [`custom:${p.id}`, p.keys])),
});

function patchKeys(next) {
  keys = next;
  render();
  fetch('/api/config', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tecladoKeys: next }),
  }).catch(() => showToast(t('teclado.bindings.errorGuardar')));
}

function patchCustomPresets(next) {
  customPresets = next;
  render();
  fetch('/api/config', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tecladoCustomPresets: next }),
  }).catch(() => showToast(t('teclado.bindings.errorGuardar')));
}

function renderPresets() {
  const grid = document.querySelector('[data-teclado-presets-grid]');
  if (!grid) return;
  const activo = presetActivo(keys, presetsCombinados());
  const builtins = Object.keys(TECLADO_PRESETS).map((id) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-chip';
    btn.classList.toggle('active', activo === id);
    btn.dataset.tecladoPreset = id;
    btn.textContent = t(`teclado.bindings.${ETIQUETA_PRESET[id]}`);
    return btn;
  });
  const propios = customPresets.map((p) => {
    const wrap = document.createElement('span');
    wrap.className = 'preset-chip-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-chip';
    btn.classList.toggle('active', activo === `custom:${p.id}`);
    btn.dataset.tecladoPresetCustom = p.id;
    btn.textContent = p.nombre;
    const borrar = document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'preset-borrar';
    borrar.dataset.tecladoPresetBorrar = p.id;
    borrar.setAttribute('aria-label', t('teclado.bindings.borrarPreset', { nombre: p.nombre }));
    borrar.textContent = '×';
    wrap.append(btn, borrar);
    return wrap;
  });
  grid.replaceChildren(...builtins, ...propios);

  const hint = document.querySelector('[data-teclado-custom-hint]');
  if (hint) hint.hidden = activo !== null;

  const guardarBtn = document.querySelector('[data-teclado-guardar-preset]');
  if (guardarBtn) guardarBtn.disabled = customPresets.length >= MAX_CUSTOM_PRESETS;
  const form = document.querySelector('[data-teclado-guardar-form]');
  if (form) form.hidden = !guardando;
}

function renderGrid() {
  const grid = document.querySelector('[data-teclado-grid]');
  if (!grid) return;
  grid.replaceChildren(...keys.map((entry) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tecla-bind-btn';
    btn.classList.toggle('seleccionada', selected === entry.key);
    btn.dataset.tecladoKey = entry.key;
    btn.style.setProperty('--ancho-u', entry.w);
    btn.textContent = entry.key;
    btn.title = selected
      ? (selected === entry.key ? t('teclado.bindings.cancelarSwap') : t('teclado.bindings.swapHint', { tecla: entry.key }))
      : t('teclado.bindings.seleccionar', { tecla: entry.key });
    return btn;
  }));

  const addBtn = document.querySelector('[data-teclado-add]');
  if (addBtn) {
    addBtn.disabled = keys.length >= MAX_TECLADO_KEYS;
    addBtn.textContent = capturing ? t('teclado.bindings.presionaTecla') : t('teclado.bindings.agregar');
    addBtn.classList.toggle('capturando', capturing);
  }
  const limite = document.querySelector('[data-teclado-limite]');
  if (limite) limite.hidden = keys.length < MAX_TECLADO_KEYS;
}

// Barra de edicion de la tecla seleccionada (ancho + quitar) — unica para
// toda la grilla, no una copia por tecla.
function renderToolbar() {
  const toolbar = document.querySelector('[data-teclado-toolbar]');
  if (!toolbar) return;
  const entry = keys.find((e) => e.key === selected);
  toolbar.hidden = !entry;
  if (!entry) return;

  const label = document.querySelector('[data-teclado-toolbar-label]');
  if (label) label.textContent = t('teclado.bindings.editando', { tecla: entry.key });
  const anchoValor = document.querySelector('[data-teclado-toolbar-ancho]');
  if (anchoValor) anchoValor.textContent = `${entry.w}×`;
  const menos = document.querySelector('[data-teclado-ancho="-1"]');
  if (menos) menos.setAttribute('aria-label', t('teclado.bindings.anchoMenos', { tecla: entry.key }));
  const mas = document.querySelector('[data-teclado-ancho="1"]');
  if (mas) mas.setAttribute('aria-label', t('teclado.bindings.anchoMas', { tecla: entry.key }));
  const quitarBtn = document.querySelector('[data-teclado-toolbar-quitar]');
  if (quitarBtn) quitarBtn.setAttribute('aria-label', t('teclado.bindings.quitar', { tecla: entry.key }));
}

function render() {
  renderGrid();
  renderToolbar();
  renderPresets();
}

function quitarTecla(key) {
  if (keys.length <= 1) {
    showToast(t('teclado.bindings.minimoUna'));
    return;
  }
  if (selected === key) selected = null;
  patchKeys(keys.filter((e) => e.key !== key));
}

function ajustarAncho(key, direccion) {
  patchKeys(keys.map((e) => (e.key === key ? { ...e, w: siguienteAncho(e.w, direccion) } : e)));
}

function intercambiar(a, b) {
  const i = keys.findIndex((e) => e.key === a);
  const j = keys.findIndex((e) => e.key === b);
  if (i === -1 || j === -1) return;
  const next = [...keys];
  [next[i], next[j]] = [next[j], next[i]];
  patchKeys(next);
}

function guardarPresetActual(nombreCrudo) {
  const nombre = nombreCrudo.trim().slice(0, MAX_PRESET_NAME_LEN);
  if (!nombre) {
    showToast(t('teclado.bindings.nombreVacio'));
    return;
  }
  if (customPresets.length >= MAX_CUSTOM_PRESETS) {
    showToast(t('teclado.bindings.limitePresets'));
    return;
  }
  const nuevo = { id: crypto.randomUUID(), nombre, keys: keys.map((e) => ({ ...e })) };
  guardando = false;
  patchCustomPresets([...customPresets, nuevo]);
  showToast(t('teclado.bindings.presetGuardado', { nombre }));
}

function deseleccionar() {
  if (!selected) return false;
  selected = null;
  render();
  return true;
}

function alClicPanel(evento) {
  const presetBtn = evento.target.closest('[data-teclado-preset]');
  if (presetBtn) {
    selected = null;
    capturing = false;
    patchKeys(TECLADO_PRESETS[presetBtn.dataset.tecladoPreset].map((e) => ({ ...e })));
    return;
  }
  const presetCustomBtn = evento.target.closest('[data-teclado-preset-custom]');
  if (presetCustomBtn) {
    selected = null;
    capturing = false;
    const preset = customPresets.find((p) => p.id === presetCustomBtn.dataset.tecladoPresetCustom);
    if (preset) patchKeys(preset.keys.map((e) => ({ ...e })));
    return;
  }
  const borrarPresetBtn = evento.target.closest('[data-teclado-preset-borrar]');
  if (borrarPresetBtn) {
    patchCustomPresets(customPresets.filter((p) => p.id !== borrarPresetBtn.dataset.tecladoPresetBorrar));
    return;
  }
  if (evento.target.closest('[data-teclado-add]')) {
    if (keys.length >= MAX_TECLADO_KEYS) return;
    selected = null;
    capturing = true;
    render();
    return;
  }
  if (evento.target.closest('[data-teclado-guardar-preset]')) {
    guardando = true;
    render();
    document.querySelector('[data-teclado-guardar-input]')?.focus();
    return;
  }
  if (evento.target.closest('[data-teclado-guardar-cancelar]')) {
    guardando = false;
    render();
    return;
  }
  if (evento.target.closest('[data-teclado-guardar-confirmar]')) {
    const input = document.querySelector('[data-teclado-guardar-input]');
    guardarPresetActual(input?.value || '');
    if (input) input.value = '';
    return;
  }

  // Barra de edicion de la tecla seleccionada.
  const anchoBtn = evento.target.closest('[data-teclado-ancho]');
  if (anchoBtn && selected) {
    ajustarAncho(selected, Number(anchoBtn.dataset.tecladoAncho));
    return;
  }
  if (evento.target.closest('[data-teclado-toolbar-quitar]') && selected) {
    quitarTecla(selected);
    return;
  }

  const bindBtn = evento.target.closest('.tecla-bind-btn');
  if (bindBtn) {
    const key = bindBtn.dataset.tecladoKey;
    if (!selected) { selected = key; render(); return; }
    if (selected === key) { deseleccionar(); return; }
    const a = selected;
    selected = null;
    intercambiar(a, key);
    return;
  }

  // Clic fuera de la grilla/barra: cancela la seleccion en curso.
  if (!evento.target.closest('[data-teclado-toolbar]')) deseleccionar();
}

function alPresionarTecla(e) {
  if (capturing) {
    e.preventDefault();
    capturing = false;
    if (e.key === 'Escape') { render(); return; }
    const tecla = codigoDomAUniverso(e.code);
    if (!tecla) {
      showToast(t('teclado.bindings.teclaNoSoportada'));
      render();
      return;
    }
    if (keys.some((entry) => entry.key === tecla)) {
      showToast(t('teclado.bindings.yaAgregada', { tecla }));
      render();
      return;
    }
    patchKeys([...keys, { key: tecla, w: 1 }]);
    return;
  }
  if (selected && e.key === 'Escape' && !e.target.closest('[data-teclado-guardar-input]')) deseleccionar();
}

function alEnterGuardarInput(e) {
  if (e.key !== 'Enter' || !e.target.closest('[data-teclado-guardar-input]')) return;
  e.preventDefault();
  guardarPresetActual(e.target.value || '');
  e.target.value = '';
}

/** Hidrata la lista real desde el servidor y pinta el panel (se llama una vez al arrancar). */
export async function initTecladoBindings() {
  const panel = document.querySelector('[data-teclado-grid]')?.closest('.teclado-bindings');
  panel?.addEventListener('click', alClicPanel);
  panel?.addEventListener('keydown', alEnterGuardarInput);
  document.addEventListener('keydown', alPresionarTecla);
  try {
    const res = await fetch('/api/config');
    if (res.ok) applyTecladoBindingsConfig(await res.json());
  } catch (_) { /* se queda con el default hasta el proximo config-updated */ }
}

/** Refresca el panel cuando otro dispositivo/pestaña cambia la lista (WS config-updated). */
export function applyTecladoBindingsConfig(cfg) {
  if (!cfg) return;
  if (Array.isArray(cfg.tecladoCustomPresets)) customPresets = cfg.tecladoCustomPresets;
  if (!Array.isArray(cfg.tecladoKeys) || !cfg.tecladoKeys.length) { render(); return; }
  if (capturing) return; // no pisar el "presiona una tecla" de una captura en curso
  keys = cfg.tecladoKeys;
  // El propio PATCH que dispara este cambio (ancho, agregar, etc.) vuelve
  // como eco por WS a la misma pestaña — si se deseleccionara siempre aca, la
  // barra de edicion se cerraria sola apenas tocas −/+ (el eco llega antes de
  // que termines de ajustar). Solo se pierde la seleccion si esa tecla ya no
  // esta en la lista nueva (otra pestaña la saco, o cambio de preset).
  if (selected && !keys.some((e) => e.key === selected)) selected = null;
  render();
}
