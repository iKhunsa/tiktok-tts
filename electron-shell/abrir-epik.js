'use strict';

const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');

/**
 * Doble clic en un archivo .epik (asociacion del instalador, ver build.fileAssociations):
 * Windows abre la app con la ruta en los argumentos (o se la pasa a la instancia que ya corre).
 * Se importa por la misma ruta HTTP que usa la UI y el resultado se entrega al renderer,
 * que muestra el aviso y pone la skin. Si el renderer aun no escucha, el resultado espera en cola.
 */
function crearAbridorEpik({ port, logger }) {
  const pendientes = [];
  let ventana = null;
  let escuchando = false;

  function entregar(resultado) {
    if (escuchando && ventana && !ventana.isDestroyed()) ventana.webContents.send('epik-abierto', resultado);
    else pendientes.push(resultado);
  }

  async function importar(ruta) {
    try {
      const respuesta = await fetch(`http://127.0.0.1:${port}/api/epik/importar`, { method: 'POST', body: fs.readFileSync(ruta) });
      const datos = await respuesta.json().catch(() => ({}));
      logger?.log('info', 'electron-shell', 'abrir-epik', 'epik.abierto', '.epik abierto con doble clic', { ok: respuesta.ok, status: respuesta.status });
      entregar({ ...datos, ok: respuesta.ok, status: respuesta.status });
    } catch (error) {
      logger?.log('warn', 'electron-shell', 'abrir-epik', 'epik.abierto.fallo', 'No se pudo abrir el .epik', { error: error.message });
      entregar({ ok: false, errorKey: 'errors.epikInvalido', error: error.message });
    }
  }

  /** Importa los .epik que vengan en los argumentos (arranque o segunda instancia). */
  function desdeArgumentos(argv = []) {
    argv.filter((arg) => typeof arg === 'string' && path.extname(arg).toLowerCase() === '.epik' && fs.existsSync(arg)).forEach(importar);
  }

  /** El renderer pide lo pendiente al suscribirse; desde ahi se le manda directo hasta que recargue. */
  function conectar(mainWindow) {
    ventana = mainWindow;
    mainWindow.webContents.on('did-start-loading', () => { escuchando = false; });
    ipcMain.handle('epik:pendientes', () => {
      escuchando = true;
      return pendientes.splice(0);
    });
  }

  return { desdeArgumentos, conectar };
}

module.exports = { crearAbridorEpik };
