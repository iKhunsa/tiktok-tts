/**
 * Barra inferior del chat en vivo: ajustes visuales (tuerca), pantalla
 * completa y ventana aparte. Solo afecta al chat, no al resto de la app.
 */
import { appSettings, saveSettings } from '../../nucleo/estado/ajustes-app.js';
import { aplicarVistaChat, abrirAjustesChat, normalizarVistaChat } from '../../componentes/chat-vista/ajustes.js';
import { atenderVentanaChat, difundirVista } from '../../componentes/chat-vista/canal.js';
import { gestorChat } from './chat-ui.js';

export function iniciarVistaChat() {
  const seccion = document.querySelector('#view-chat .chat-section');
  if (!seccion) return;

  const aplicar = () => { aplicarVistaChat(seccion, appSettings.chatVista, gestorChat()); difundirVista(appSettings.chatVista); };
  aplicar();

  document.getElementById('chatBtnAjustes')?.addEventListener('click', () => {
    abrirAjustesChat({
      contenedor: seccion,
      cfg: appSettings.chatVista,
      onChange: (cfg) => { appSettings.chatVista = normalizarVistaChat(cfg); saveSettings(); aplicar(); },
    });
  });

  const btnPantalla = document.getElementById('chatBtnPantalla');
  btnPantalla?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else seccion.requestFullscreen?.().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    const activa = document.fullscreenElement === seccion;
    const img = btnPantalla?.querySelector('img');
    if (img) img.src = activa ? 'icons/fullscreen_exit.svg' : 'icons/fullscreen.svg';
  });

  atenderVentanaChat();
}
