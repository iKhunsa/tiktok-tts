'use strict';

const { reportIdea } = require('./routes/report-idea');
const { reportOverlayIdea } = require('./routes/report-overlay-idea');

module.exports = {
  name: 'sugerencias',
  register({ app, bus, logger }) {
    app.post('/api/ideas', reportIdea(logger, bus));
    app.post('/api/ideas/overlay', reportOverlayIdea(logger, bus));
    return { rutas: 2, listeners: 0 };
  },
};
