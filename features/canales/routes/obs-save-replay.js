'use strict';

const { saveReplay } = require('../obs/save-replay');

function obsSaveReplay(deps) {
  return (_req, res) => {
    saveReplay(deps)
      .then(() => res.json({ success: true }))
      .catch((err) => res.status(err.statusCode || 500).json({ error: err.message }));
  };
}

module.exports = { obsSaveReplay };
