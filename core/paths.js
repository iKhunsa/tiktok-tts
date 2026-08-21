'use strict';

const path = require('path');

// __dirname aca es core/, la raiz real del repo/paquete esta un nivel arriba.
const ROOT = path.join(__dirname, '..');

const RESOURCE_BASE = process.env.TIKTOK_RESOURCES_PATH || ROOT;
const DATA_BASE = process.env.TIKTOK_USER_DATA_PATH || RESOURCE_BASE;

module.exports = { RESOURCE_BASE, DATA_BASE };
