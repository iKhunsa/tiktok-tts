'use strict';

const MAX_LOGS_LIMIT = 250;

function getLogs(logger) {
  return (req, res) => {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '100', 10) || 100, MAX_LOGS_LIMIT));
    res.json({ logs: logger.getBuffer().slice(-limit) });
  };
}

module.exports = { getLogs };
