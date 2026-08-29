'use strict';

const { readSessionLogEntries } = require('../logs/read-session-log-entries');
const { entriesToMarkdown } = require('../logs/entries-to-markdown');

function getSessionLogFile(logger) {
  return async (req, res, next) => {
    try {
      const format = req.query.format === 'md' ? 'md' : 'json';
      const entries = await readSessionLogEntries(logger.getSessionLogPath(), logger);
      if (format === 'md') {
        res.type('text/markdown').send(entriesToMarkdown(entries));
      } else {
        res.type('application/json').send(JSON.stringify(entries, null, 2));
      }
    } catch (err) {
      next(err); // → middleware de error global de core/app.js
    }
  };
}

module.exports = { getSessionLogFile };
