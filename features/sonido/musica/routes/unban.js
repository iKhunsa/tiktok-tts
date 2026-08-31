'use strict';

const { getConfigSnapshot, patchConfig } = require('../../config-bridge');

function unban(bus) {
  return (req, res) => {
    const { username } = req.body || {};
    if (!username || typeof username !== 'string') return res.status(400).json({ error: 'username requerido' });
    const clean = username.trim().toLowerCase();
    const config = getConfigSnapshot(bus);
    const musicBannedUsers = config.musicBannedUsers.filter((u) => u !== clean);
    patchConfig(bus, { musicBannedUsers });
    res.json({ ok: true, banned: musicBannedUsers });
  };
}

module.exports = { unban };
