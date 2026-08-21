'use strict';

function ensureSingleInstance(app, onSecondInstance) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    process.exit(0);
  }
  app.on('second-instance', onSecondInstance);
}

module.exports = { ensureSingleInstance };
