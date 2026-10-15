import { t } from '../../../nucleo/i18n/i18n.js';
import { enlacesLegales } from './enlaces-legales.js';

export function enlazarAvisoRegistro({ raiz, idioma }) {
  const aviso = raiz.querySelector('#cuentaRegisterTerms');
  if (!aviso) return;

  const enlaces = enlacesLegales(idioma);
  for (const [tipo, url] of Object.entries(enlaces)) {
    const enlace = aviso.querySelector(`[data-register-terms-link="${tipo}"]`);
    if (!enlace) continue;
    enlace.href = url;
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    enlace.textContent = t(`cuenta.${tipo}Link`);
  }
}
