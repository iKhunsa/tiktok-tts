'use strict';

const { readSessionLogEntries } = require('../logs/read-session-log-entries');
const { entriesToMarkdown } = require('../logs/entries-to-markdown');

function getSessionLogFile(logger) {
  return async (req, res) => {
    const format = req.query.format === 'md' ? 'md' : 'json';
    const entries = await readSessionLogEntries(logger.getSessionLogPath());
    if (format === 'md') {
      res.type('text/markdown').send(entriesToMarkdown(entries));
    } else {
      res.type('application/json').send(JSON.stringify(entries, null, 2));
    }
  };
}

module.exports = { getSessionLogFile };
