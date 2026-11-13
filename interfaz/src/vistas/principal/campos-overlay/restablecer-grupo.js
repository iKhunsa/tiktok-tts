import { valoresPorDefecto } from '../../../../compartido/estilo/query.js';
import { saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { fijarValorOverlay } from '../overlays-catalogo/posicion-escena.js';
import { camposDeGrupo, sincronizarCamposOverlay } from './sincronizar.js';

const CONFIRMACION_MS = 3000;

function cancelarConfirmacion(boton) {
  delete boton.dataset.confirmar;
  boton.querySelector('span').textContent = '';
}

function restablecer(boton) {
  const { cfgOverlay: overlay, cfgResetGrupo: grupo } = boton.dataset;
  cancelarConfirmacion(boton);
  const defaults = JSON.parse(JSON.stringify(valoresPorDefecto(camposDeGrupo(overlay, grupo))));
  for (const [clave, valor] of Object.entries(defaults)) fijarValorOverlay(overlay, clave, valor);
  updateOverlayUrl(overlay);
  saveSettings();
  sincronizarCamposOverlay(overlay);
  showToast(t('toast.groupReset'));
}

/**
 * Boton de restablecer de un acordeon. Va dentro del <summary>: sin preventDefault
 * cada clic lo plegaria. Dos clics, igual que el restablecer del overlay completo.
 */
export function alPulsarRestablecerGrupo(evento) {
  const boton = evento.target.closest('[data-cfg-reset-grupo]');
  if (!boton) return;
  evento.preventDefault();
  if (boton.dataset.confirmar) return restablecer(boton);
  boton.dataset.confirmar = '1';
  boton.querySelector('span').textContent = t('btn.resetConfirm');
  setTimeout(() => cancelarConfirmacion(boton), CONFIRMACION_MS);
}
