'use strict';

const path = require('path');
const { RESOURCE_BASE } = require('../../core/paths');

function mobilePage() {
  return (_req, res) => {
    res.sendFile(path.join(RESOURCE_BASE, 'public', 'mobile.html'));
  };
}

module.exports = { mobilePage };
