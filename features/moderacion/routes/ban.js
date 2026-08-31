'use strict';

const { resolveUntil, applyModAction } = require('../apply-mod-action');

function ban(deps) {
  return (req, res) => {
    const until = resolveUntil((req.body || {}).durationMs);
    if (until === null) return res.status(400).json({ error: 'durationMs invalido' });
    applyModAction(deps, req, res, (t) => deps.store.setBan(t, until), { blockAdmin: true });
  };
}

module.exports = { ban };
