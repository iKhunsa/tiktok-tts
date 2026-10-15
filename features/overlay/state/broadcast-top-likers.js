'use strict';

const { rankTop } = require('./rank-top');
const { MAX_TOP_ROWS } = require('./top-limits');

function broadcastTopLikers(bus, topLikers) {
  bus.emit('ws:broadcast', { type: 'top-likers', topLikers: rankTop(topLikers, 'totalLikes', MAX_TOP_ROWS) });
}

module.exports = { broadcastTopLikers };
