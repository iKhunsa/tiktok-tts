/**
 * Ventana aparte del chat en vivo. Recibe los mensajes de la ventana
 * principal por BroadcastChannel (componentes/chat-vista/canal.js) y no abre
 * conexiones propias. Sus ajustes
 * (tipografia, emotes, dividido, plataformas visibles) copian los de la tuerca de la principal.
 */
import { cargarIdioma, idiomaGuardado, aplicarTraducciones, detectarIdiomaNavegador } from '../../nucleo/i18n/i18n.js';
import { crearNodoMensaje } from '../../componentes/chat-vista/mensaje.js';
import { crearGestorLog } from '../../componentes/chat-vista/columnas.js';
import { escucharChat } from '../../componentes/chat-vista/canal.js';
import { aplicarVistaChat, abrirAjustesChat, normalizarVistaChat } from '../../componentes/chat-vista/ajustes.js';

const MAX_UNIFICADO = 300;

async function iniciar() {
  await cargarIdioma(idiomaGuardado() || detectarIdiomaNavegador(['es', 'en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru']));
  aplicarTraducciones();

  const raiz = document.getElementById('chatVentana');
  const log = document.getElementById('chatLog');
  const gestor = crearGestorLog(log);
  let cfg = normalizarVistaChat(null); // hasta recibir los ajustes de la ventana principal
  aplicarVistaChat(raiz, cfg, gestor);

  document.getElementById('chatBtnAjustes').addEventListener('click', () => {
    abrirAjustesChat({
      contenedor: raiz,
      cfg,
      onChange: (nueva) => {
        cfg = normalizarVistaChat(nueva);
        aplicarVistaChat(raiz, cfg, gestor);
      },
    });
  });

  escucharChat({
    onMensaje: (data, msgId) => {
      document.getElementById('emptyState')?.remove();
      if (document.getElementById(msgId)) return; // el historial puede repetir lo ya pintado
      const { node, platform } = crearNodoMensaje(data, msgId);
      const alFondo = log.scrollHeight - log.scrollTop - log.clientHeight <= 60;
      const cont = gestor.agregar(node, platform);
      if (cont === log) {
        while (log.childElementCount > MAX_UNIFICADO) log.firstElementChild.remove();
        if (alFondo) log.scrollTop = log.scrollHeight;
      }
    },
    onVista: (nueva) => { cfg = normalizarVistaChat(nueva); aplicarVistaChat(raiz, cfg, gestor); },
    onLimpiar: () => { log.replaceChildren(); gestor.reiniciar(); },
  });
}

iniciar();
