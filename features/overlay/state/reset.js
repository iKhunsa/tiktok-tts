'use strict';

const { clearCredits } = require('./credits');

function resetOverlayState(state) {
  state.followCount = 0;
  state.topLikers.clear();
  state.topDonors.clear();
  state.baseFollowerCount = 0;
  state.followerBaseByChannel.clear();
  state.viewerCountByChannel.clear();
  clearCredits(state.credits);
}

module.exports = { resetOverlayState };
