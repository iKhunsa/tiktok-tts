'use strict';

function resetOverlayState(state) {
  state.followCount = 0;
  state.topLikers.clear();
  state.baseFollowerCount = 0;
  state.followerBaseByChannel.clear();
  state.sharers = [];
  state.credits.donors = [];
  state.credits.followers = [];
  state.credits.sharers = [];
}

module.exports = { resetOverlayState };
