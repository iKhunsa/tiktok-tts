'use strict';

function deleteViewer(deps) {
  return (req, res) => {
    const key = (req.body || {}).key;
    if (!key || !deps.store.parseKey(key)) return res.status(400).json({ error: 'key invalida' });
    const removed = deps.store.remove(key);
    deps.store.flush();
    if (removed) deps.bus.emit('ws:broadcast', { type: 'moderation-reset' });
    res.json({ ok: true, removed });
  };
}

module.exports = { deleteViewer };
