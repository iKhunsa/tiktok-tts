'use strict';

const { sweepOldSessionLogs } = require('./retention-sweep');
const { attachErrorListeners } = require('./error-listeners');
const { reportBug } = require('./routes/report-bug');

module.exports = {
  name: 'reporte-bug',

  register({ app, bus, logger }) {
    sweepOldSessionLogs(logger);
    attachErrorListeners(bus, logger);
    app.post('/api/report-bug', reportBug(logger));

    return { rutas: 1, listeners: 2 };
  },
};
