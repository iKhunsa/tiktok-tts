'use strict';

const { creditsToJSON } = require('../state/credits');
const { rankTop } = require('../state/rank-top');
const { MAX_TOP_ROWS } = require('../state/top-limits');

function overlayStats(state) {
  return (_req, res) => {
    res.json({
      followCount: state.followCount,
      baseFollowerCount: state.baseFollowerCount,
      topLikers: rankTop(state.topLikers, 'totalLikes', MAX_TOP_ROWS),
      topDonors: rankTop(state.topDonors, 'totalCoins', MAX_TOP_ROWS),
      sharers: creditsToJSON(state.credits).sharers.slice(-20),
      credits: creditsToJSON(state.credits),
    });
  };
}

module.exports = { overlayStats };
