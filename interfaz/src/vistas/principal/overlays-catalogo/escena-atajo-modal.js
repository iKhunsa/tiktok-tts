import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';

// Captura de atajo por escena, mismo mecanismo que soundpad.js (_spKeyCapture): requiere un modificador real
// (Ctrl/Alt/Shift), 10s de ventana, Escape cancela. El atajo activa la escena en OBS via la URL dinamica.
let capturando = false;
let temporizador = null;

function actualizarValor(overlay, escena) {
  const valor = overlay.querySelector('[data-valor]');
  valor.textContent = escena.shortcut || t('overlayCat.editor.atajoEscenaVacio');
  valor.classList.remove('capturing');
  overlay.querySelector('[data-quitar]').disabled = !escena.shortcut;
}

async function capturarAtajo(overlay, escena, onCambiar) {
  cancelarCaptura(overlay, escena);
  capturando = true;
  const valor = overlay.querySelector('[data-valor]');
  valor.textContent = t('soundpad.pressKey');
  valor.classList.add('capturing');
  overlay.querySelector('[data-asignar]').disabled = true;

  const terminar = () => {
    capturando = false;
    clearTimeout(temporizador);
    document.removeEventListener('keydown', onKeyDown, { capture: true });
    overlay.querySelector('[data-asignar]').disabled = false;
  };

  async function onKeyDown(evento) {
    if (evento.key === 'Escape') {
      evento.preventDefault(); evento.stopPropagation();
      terminar();
      actualizarValor(overlay, escena);
      return;
    }
    const tecla = evento.key.toUpperCase();
    if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(tecla)) return;
    const mods = [];
    if (evento.ctrlKey) mods.push('Ctrl');
    if (evento.shiftKey) mods.push('Shift');
    if (evento.altKey) mods.push('Alt');
    if (!mods.length) { showToast(t('toast.shortcutModifier')); return; }
    evento.preventDefault(); evento.stopPropagation();
    terminar();
    const shortcut = [...mods, tecla].join('+');
    const resultado = await window.electronAPI?.registerSceneShortcut?.(escena.id, shortcut);
    if (!resultado?.ok) {
      showToast(resultado?.error === 'conflict' ? t('conn.shortcutConflict') : (resultado?.error || t('conn.shortcutUnavailable')));
      actualizarValor(overlay, escena);
      return;
    }
    escena.shortcut = shortcut;
    onCambiar();
    actualizarValor(overlay, escena);
  }

  document.addEventListener('keydown', onKeyDown, { capture: true });
  temporizador = setTimeout(() => { terminar(); actualizarValor(overlay, escena); }, 10000);
}

function cancelarCaptura(overlay, escena) {
  if (!capturando) return;
  capturando = false;
  clearTimeout(temporizador);
  actualizarValor(overlay, escena);
}

/** Modal para asignar/quitar el atajo de teclado global que activa esta escena para la URL dinamica de OBS. */
export function abrirModalAtajoEscena(escena, onCambiar) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="atajoEscenaTitulo">
      <button class="modal-close" type="button" data-cerrar><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 id="atajoEscenaTitulo" data-i18n="overlayCat.editor.atajoEscenaTitulo"></h2>
      <p class="cuenta-hint" data-i18n="overlayCat.editor.atajoEscenaSub"></p>
      <div class="sp-shortcut-row">
        <span class="sp-shortcut-value" data-valor></span>
        <button class="cfg-btn" type="button" data-asignar><span data-i18n="soundpad.assignShortcut"></span></button>
        <button class="cfg-btn" type="button" data-quitar><span data-i18n="btn.remove"></span></button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);
  actualizarValor(overlay, escena);

  const cerrar = () => { cancelarCaptura(overlay, escena); overlay.remove(); };
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) cerrar(); });
  overlay.addEventListener('keydown', (evento) => { if (evento.key === 'Escape' && !capturando) cerrar(); });
  overlay.querySelector('[data-cerrar]').addEventListener('click', cerrar);

  overlay.querySelector('[data-asignar]').addEventListener('click', () => capturarAtajo(overlay, escena, onCambiar));
  overlay.querySelector('[data-quitar]').addEventListener('click', async () => {
    if (!escena.shortcut) return;
    await window.electronAPI?.unregisterSceneShortcut?.(escena.id);
    escena.shortcut = null;
    onCambiar();
    actualizarValor(overlay, escena);
  });
}
