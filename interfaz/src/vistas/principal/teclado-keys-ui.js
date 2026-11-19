import {
  MAX_TECLADO_KEYS, MAX_CUSTOM_PRESETS, MAX_PRESET_NAME_LEN, TECLADO_PRESETS, DEFAULT_TECLADO_KEYS,
  GRID_COLS, GRID_ROWS, spanCols, celdasOcupadas, codigoDomAUniverso, siguienteAncho, presetActivo,
  destinosValidos, primeraCeldaAdyacenteLibre,
} from '../../../compartido/teclado-keys.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

// El tablero de celdas SIEMPRE se ve (puntos .teclado-cell-vacia, mismo
// lenguaje visual que el selector de posicion de 9 cuadros de otros
// overlays) — nunca aparece de la nada recien al tocar una tecla, para que
// de entrada se entienda que es un tablero donde las teclas se "sueltan" en
// un cuadro. Mover una tecla: arrastrarla hasta un cuadro resaltado, o (sin
// mouse fino) click en la tecla y despues click en el cuadro. Los controles
// de ancho/quitar de la tecla seleccionada salen en una barra aparte.
const EDITOR_UNIDAD = 34; // ancho en px de 1 celda/unidad en el editor (ver teclado-bindings.css)

let keys = DEFAULT_TECLADO_KEYS;
let customPresets = [];
let selected = null; // key seleccionada/arrastrada: muestra su barra de edicion y los cuadros donde se puede soltar
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

// Recorte visible del tablero: el bounding box de las teclas puestas + 1
// anillo de celdas alrededor (para que siempre se note que hay mas lugar
// donde mover), recortado a los limites reales de la grilla logica.
function limitesVisibles() {
  const minRow = Math.max(0, Math.min(...keys.map((e) => e.row)) - 1);
  const minCol = Math.max(0, Math.min(...keys.map((e) => e.col)) - 1);
  const maxRow = Math.min(GRID_ROWS - 1, Math.max(...keys.map((e) => e.row)) + 1);
  const maxColEnd = Math.min(GRID_COLS, Math.max(...keys.map((e) => e.col + spanCols(e))) + 1);
  return { minRow, minCol, maxRow, maxColEnd };
}

function ubicar(el, entry, limites) {
  el.style.gridRow = `${entry.row - limites.minRow + 1} / span 1`;
  el.style.gridColumn = `${entry.col - limites.minCol + 1} / span ${spanCols(entry)}`;
}

function renderGrid() {
  const grid = document.querySelector('[data-teclado-grid]');
  if (!grid) return;
  const limites = limitesVisibles();
  grid.style.setProperty('--teclado-grid-cols', limites.maxColEnd - limites.minCol);
  grid.style.setProperty('--teclado-grid-rows', limites.maxRow - limites.minRow + 1);

  const entrySeleccionada = keys.find((e) => e.key === selected);
  const destinos = entrySeleccionada ? new Set(destinosValidos(keys, entrySeleccionada).map(({ row, col }) => `${row},${col}`)) : null;

  const ocupadas = new Set();
  for (const entry of keys) for (const { row, col } of celdasOcupadas(entry)) ocupadas.add(`${row},${col}`);

  const celdas = [];
  for (let row = limites.minRow; row <= limites.maxRow; row += 1) {
    for (let col = limites.minCol; col < limites.maxColEnd; col += 1) {
      if (ocupadas.has(`${row},${col}`)) continue;
      const esValida = !!destinos?.has(`${row},${col}`);
      const celda = document.createElement('button');
      celda.type = 'button';
      celda.className = 'teclado-cell-vacia';
      celda.classList.toggle('valida', esValida);
      celda.disabled = !esValida;
      if (esValida) {
        celda.dataset.tecladoDestinoRow = row;
        celda.dataset.tecladoDestinoCol = col;
        celda.setAttribute('aria-label', t('teclado.bindings.moverAca', { tecla: entrySeleccionada.key }));
      } else {
        celda.setAttribute('aria-hidden', 'true');
      }
      ubicar(celda, { row, col, w: 1 }, limites);
      celdas.push(celda);
    }
  }

  const teclas = keys.map((entry) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tecla-bind-btn';
    btn.classList.toggle('seleccionada', selected === entry.key);
    btn.draggable = true;
    btn.dataset.tecladoKey = entry.key;
    btn.textContent = entry.key;
    btn.style.width = `${entry.w * EDITOR_UNIDAD}px`;
    btn.title = selected === entry.key ? t('teclado.bindings.cancelarMover') : t('teclado.bindings.seleccionar', { tecla: entry.key });
    ubicar(btn, entry, limites);
    return btn;
  });

  grid.replaceChildren(...celdas, ...teclas);

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

// Agrandar nunca puede dejar el conjunto partido (una tecla que ya tocaba a
// otra sigue tocandola al crecer) — solo hay que validar que el nuevo ancho
// siga entrando en la grilla sin pisar a la tecla vecina.
function ajustarAncho(key, direccion) {
  const entry = keys.find((e) => e.key === key);
  if (!entry) return;
  const siguiente = { ...entry, w: siguienteAncho(entry.w, direccion) };
  const cabe = destinosValidos(keys, siguiente).some((c) => c.row === entry.row && c.col === entry.col);
  if (!cabe) {
    showToast(t('teclado.bindings.sinEspacio', { tecla: key }));
    return;
  }
  patchKeys(keys.map((e) => (e.key === key ? siguiente : e)));
}

function moverTecla(key, row, col) {
  patchKeys(keys.map((e) => (e.key === key ? { ...e, row, col } : e)));
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

  const destinoBtn = evento.target.closest('.teclado-cell-vacia.valida');
  if (destinoBtn && selected) {
    const key = selected;
    selected = null;
    moverTecla(key, Number(destinoBtn.dataset.tecladoDestinoRow), Number(destinoBtn.dataset.tecladoDestinoCol));
    return;
  }

  const bindBtn = evento.target.closest('.tecla-bind-btn');
  if (bindBtn) {
    const key = bindBtn.dataset.tecladoKey;
    selected = selected === key ? null : key;
    render();
    return;
  }

  // Clic fuera de la grilla/barra: cancela la seleccion en curso.
  if (!evento.target.closest('[data-teclado-toolbar]')) deseleccionar();
}

// Arrastrar y soltar: el gesto mas natural para reposicionar algo en un
// tablero. Sigue existiendo el flujo de click+click (abajo) para quien no
// pueda arrastrar con precision — ambos caminos usan el mismo `selected` y
// los mismos cuadros `.teclado-cell-vacia.valida`.
function alArrastrarInicio(evento) {
  const bindBtn = evento.target.closest('.tecla-bind-btn');
  if (!bindBtn) return;
  const key = bindBtn.dataset.tecladoKey;
  evento.dataTransfer.setData('text/plain', key);
  evento.dataTransfer.effectAllowed = 'move';
  selected = key;
  render();
}

function alArrastrarSobre(evento) {
  const destino = evento.target.closest('.teclado-cell-vacia.valida');
  if (!destino || !selected) return;
  evento.preventDefault();
  if (!destino.classList.contains('sobrevolada')) {
    document.querySelectorAll('.teclado-cell-vacia.sobrevolada').forEach((el) => el.classList.remove('sobrevolada'));
    destino.classList.add('sobrevolada');
  }
}

function alArrastrarSalir(evento) {
  evento.target.closest('.teclado-cell-vacia')?.classList.remove('sobrevolada');
}

function alSoltar(evento) {
  const destino = evento.target.closest('.teclado-cell-vacia.valida');
  if (!destino || !selected) return;
  evento.preventDefault();
  const key = selected;
  selected = null;
  moverTecla(key, Number(destino.dataset.tecladoDestinoRow), Number(destino.dataset.tecladoDestinoCol));
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
    const celda = primeraCeldaAdyacenteLibre(keys, 1);
    if (!celda) {
      showToast(t('teclado.bindings.sinEspacio', { tecla }));
      render();
      return;
    }
    patchKeys([...keys, { key: tecla, w: 1, row: celda.row, col: celda.col }]);
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
  panel?.addEventListener('dragstart', alArrastrarInicio);
  panel?.addEventListener('dragover', alArrastrarSobre);
  panel?.addEventListener('dragleave', alArrastrarSalir);
  panel?.addEventListener('drop', alSoltar);
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
