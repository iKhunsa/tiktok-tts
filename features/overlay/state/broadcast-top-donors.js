'use strict';

const { rankTop } = require('./rank-top');
const { MAX_TOP_ROWS } = require('./top-limits');

function broadcastTopDonors(bus, topDonors) {
  bus.emit('ws:broadcast', { type: 'top-donors', topDonors: rankTop(topDonors, 'totalCoins', MAX_TOP_ROWS) });
}

module.exports = { broadcastTopDonors };
