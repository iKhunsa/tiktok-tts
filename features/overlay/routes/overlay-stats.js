'use strict';

const { creditsToJSON } = require('../state/credits');
const { rankTop } = require('../state/rank-top');
const { MAX_TOP_ROWS } = require('../state/top-limits');
const { totalViewerCount } = require('../state/total-viewer-count');

function overlayStats(state) {
  return (_req, res) => {
    res.json({
      followCount: state.followCount,
      baseFollowerCount: state.baseFollowerCount,
      viewerCount: totalViewerCount(state.viewerCountByChannel),
      topLikers: rankTop(state.topLikers, 'totalLikes', MAX_TOP_ROWS),
      topDonors: rankTop(state.topDonors, 'totalCoins', MAX_TOP_ROWS),
      sharers: creditsToJSON(state.credits).sharers.slice(-20),
      credits: creditsToJSON(state.credits),
    });
  };
}

module.exports = { overlayStats };
