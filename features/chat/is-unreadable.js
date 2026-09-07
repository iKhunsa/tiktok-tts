'use strict';

function isUnreadable(name) {
  return !/[\p{L}\p{N}]/u.test(name);
}

module.exports = { isUnreadable };
