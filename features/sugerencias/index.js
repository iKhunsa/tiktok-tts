'use strict';

const { reportIdea } = require('./routes/report-idea');

module.exports = {
  name: 'sugerencias',
  register({ app, bus, logger }) {
    app.post('/api/ideas', reportIdea(logger, bus));
    return { rutas: 1, listeners: 0 };
  },
};
