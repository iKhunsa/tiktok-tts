/**
 * Programa de creadores: promo dentro del empty state del chat (visible solo sin
 * canales conectados, lo decide `.chat-section.sin-live` en CSS) + modal con la
 * explicacion. La accion del CTA se inyecta: hoy abre el modal; mañana puede ser
 * una URL, una vista o un formulario sin tocar el markup.
 */
import { openDiscordModal } from './modales-avisos.js';

export function iniciarProgramaCreadores({ abrir, participar = () => openDiscordModal('creator_program') } = {}) {
  const overlay = document.getElementById('creatorProgramModal');
  if (!overlay) return;

  const cerrar = () => overlay.classList.remove('show');
  const abrirModal = abrir || (() => overlay.classList.add('show'));

  // Delegado en document: el empty state se recrea al limpiar el chat.
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-creator-program]')) abrirModal();
  });

  overlay.querySelector('.creator-program-join').addEventListener('click', () => {
    cerrar();
    participar();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.modal-close').addEventListener('click', cerrar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
}
