/**
 * Dispara el baile OAuth de una plataforma en el proceso principal
 * (electron-shell/{google,twitch,kick}-auth.js, via preload) y devuelve
 * {code, codeVerifier?, redirectUri}. Compartido por login/registro/vincular/
 * borrar (Google) y por vincular Twitch/Kick desde el perfil — mismo patron,
 * una sola implementacion del try/catch + toast de error.
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';

async function autenticarConPlataformaUI(disparar) {
  try {
    return await disparar();
  } catch (_) {
    showToast(t('errors.generic'));
    return null;
  }
}

export const autenticarConGoogleUI = () => autenticarConPlataformaUI(() => window.electronAPI.authGoogle());
export const autenticarConTwitchUI = () => autenticarConPlataformaUI(() => window.electronAPI.authTwitch());
export const autenticarConKickUI = () => autenticarConPlataformaUI(() => window.electronAPI.authKick());
