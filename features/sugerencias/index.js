'use strict';

const { reportIdea } = require('./routes/report-idea');
const { reportBaja, reportCancelacion } = require('./routes/report-baja');
const { reportOverlayIdea } = require('./routes/report-overlay-idea');

module.exports = {
  name: 'sugerencias',
  register({ app, bus, logger }) {
    app.post('/api/ideas', reportIdea(logger, bus));
    app.post('/api/ideas/overlay', reportOverlayIdea(logger, bus));
    app.post('/api/baja-feedback', reportBaja(logger));
    app.post('/api/cancelacion-feedback', reportCancelacion(logger));
    return { rutas: 4, listeners: 0 };
  },
};
