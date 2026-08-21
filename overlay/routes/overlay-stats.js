'use strict';

function overlayStats(state) {
  return (_req, res) => {
    const topLikers = [...state.topLikers.values()].sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 10);
    res.json({
      followCount: state.followCount,
      baseFollowerCount: state.baseFollowerCount,
      topLikers,
      sharers: state.sharers.slice(-20),
      credits: {
        donors: state.credits.donors.slice(-50),
        followers: state.credits.followers.slice(-50),
        sharers: state.credits.sharers.slice(-50),
      },
    });
  };
}

module.exports = { overlayStats };
