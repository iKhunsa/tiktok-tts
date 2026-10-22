'use strict';

const { dialog } = require('electron');
const { listarReleases, compararVersiones } = require('./github-releases');
const { descargarInstalador, ejecutarInstalador } = require('./instalar-version');

// Logica propia en vez del mecanismo de "canales" de electron-updater: ese
// solo deja mirar UN canal fijo (latest.yml/beta.yml/...) a la vez, y acá
// necesitamos que el admin vea estable+beta+alpha sumados, el beta tester
// estable+beta, y el usuario normal solo estable — sin que subir una build
// alpha obligue a publicar tambien una beta o una estable.
function tagsPermitidos(rol) {
  if (rol === 'admin') return [null, 'beta', 'alpha'];
  if (rol === 'beta') return [null, 'beta'];
  return [null]; // 'user' (default) — solo estables
}

// `auth:get` es el contrato sincrono expuesto por features/auth/index.js.
// Se lee fresco en cada chequeo, asi un login/logout entre chequeos se
// respeta solo, sin tener que engancharse a eventos de sesion.
function rolDeSesion(bus) {
  let rol = 'user';
  bus.emit('auth:get', (sesion) => {
    const r = sesion && sesion.user && sesion.user.rolCanal;
    if (r === 'beta' || r === 'admin') rol = r;
  });
  return rol;
}

// Busca, entre los releases reales de GitHub, el mas nuevo que el rol de
// esta cuenta puede ver y que ademas sea mas nuevo que la version actual.
async function buscarDisponible(bus, versionActual) {
  const permitidos = tagsPermitidos(rolDeSesion(bus));
  const releases = await listarReleases();
  const candidatas = releases
    .filter((r) => permitidos.includes(r.tag))
    .sort((a, b) => compararVersiones(b.version, a.version));
  const mejor = candidatas[0];
  if (mejor && compararVersiones(mejor.version, versionActual) > 0) return mejor;
  return null;
}

let _app = null;
let _bus = null;
let _logger = null;
let _getMainWindow = null;
let _getTray = null;
let _buildTrayMenu = null;
let _onPendingVersion = null;
let _pendiente = null; // { destino, version } del instalador ya descargado

function sendUpdate(data) {
  const win = _getMainWindow && _getMainWindow();
  if (win && !win.isDestroyed()) win.webContents.send('update-event', data);
}

async function chequear() {
  _bus.emit('update:check');
  sendUpdate({ type: 'checking' });

  let disponible;
  try {
    disponible = await buscarDisponible(_bus, _app.getVersion());
  } catch (err) {
    _bus.emit('update:error', { message: err.message });
    sendUpdate({ type: 'error', message: err.message });
    _logger.log(
      'warn', 'electron-shell', 'electron-shell/updater.js#chequear', 'electron_shell.updater.chequeo_fallido',
      `Fallo el chequeo de actualizaciones: ${err.message}`, { error: err.message }
    );
    return;
  }

  if (!disponible) { sendUpdate({ type: 'not-available' }); return; }

  const prerelease = disponible.tag !== null;
  _bus.emit('update:available', { from: _app.getVersion(), to: disponible.version });
  sendUpdate({ type: 'available', version: disponible.version, prerelease });

  try {
    const destino = await descargarInstalador(_app, disponible.asset, (p) => {
      sendUpdate({ type: 'progress', version: disponible.version, percent: p.percent, transferred: p.transferido, total: p.total, bytesPerSecond: 0 });
    });
    _pendiente = { destino, version: disponible.version };
    _onPendingVersion(disponible.version);
    _bus.emit('update:downloaded', { from: _app.getVersion(), to: disponible.version });

    // Reconstruye el menu de tray con el atajo de instalar — funciona
    // incluso si el preload/banner no esta disponible.
    const tray = _getTray();
    if (tray) tray.setContextMenu(_buildTrayMenu(disponible.version));

    sendUpdate({ type: 'ready', version: disponible.version, prerelease });

    // Fallback de dialogo nativo — garantizado sin importar el estado del preload/banner.
    dialog.showMessageBox({
      type: 'info',
      title: prerelease ? 'TikLiveTTS — Versión experimental lista' : 'TikLiveTTS — Actualización lista',
      message: prerelease
        ? `v${disponible.version} (EXPERIMENTAL) descargada y lista para instalar.`
        : `v${disponible.version} descargada y lista para instalar.`,
      detail: 'La app se reiniciará sola (no requiere reiniciar el PC).\n¿Instalar ahora?',
      buttons: ['Instalar ahora', 'Después'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) installUpdate();
    });
  } catch (err) {
    _bus.emit('update:error', { message: err.message });
    sendUpdate({ type: 'error', message: err.message });
    _logger.log(
      'error', 'electron-shell', 'electron-shell/updater.js#chequear', 'electron_shell.updater.error',
      `Error del auto-updater: ${err.message}`, { error: err.message, stack: err.stack }
    );
  }
}

function setupAutoUpdater({ app, bus, logger, getMainWindow, getTray, buildTrayMenu, onPendingVersion }) {
  _app = app;
  _bus = bus;
  _logger = logger;
  _getMainWindow = getMainWindow;
  _getTray = getTray;
  _buildTrayMenu = buildTrayMenu;
  _onPendingVersion = onPendingVersion;

  chequear().catch((err) => logger.log(
    'warn', 'electron-shell', 'electron-shell/updater.js#setupAutoUpdater', 'electron_shell.updater.chequeo_fallido',
    `Fallo el chequeo de actualizaciones: ${err.message}`, { error: err.message }
  ));
}

// Chequeo manual (botón "Buscar actualizaciones" de la UI) — mismo flujo que
// el automatico del arranque, re-evaluando el rol de cuenta por si cambio.
function checkForUpdates() {
  return chequear();
}

function installUpdate() {
  if (!_pendiente) return;
  ejecutarInstalador(_pendiente.destino);
  _app.quit();
}

module.exports = { setupAutoUpdater, checkForUpdates, installUpdate };
