'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_BASE } = require('../../../core/paths');

const AUTH_TOKENS_FILE = path.join(DATA_BASE, 'auth-tokens.json');

function saveAuthTokens(deps) {
  const { state, logger } = deps;
  try {
    fs.writeFileSync(AUTH_TOKENS_FILE, `${JSON.stringify(state.authTokens, null, 2)}\n`, 'utf8');
  } catch (error) {
    logger.log(
      'error', 'canales', 'canales/twitch/oauth/auth-tokens-store.js#saveAuthTokens', 'canales.twitch_oauth.tokens_guardado_fallido',
      `No se pudo guardar auth-tokens.json: ${error.message}`, { path: AUTH_TOKENS_FILE, error: error.message, stack: error.stack }
    );
  }
}

function loadAuthTokens(deps) {
  const { state, logger } = deps;
  try {
    if (!fs.existsSync(AUTH_TOKENS_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(AUTH_TOKENS_FILE, 'utf8'));
    if (parsed && typeof parsed === 'object' && parsed.twitch && parsed.twitch.accessToken) {
      state.authTokens.twitch = parsed.twitch;
    }
    logger.log(
      'info', 'canales', 'canales/twitch/oauth/auth-tokens-store.js#loadAuthTokens', 'canales.twitch_oauth.tokens_cargados',
      'auth-tokens.json cargado', { twitch: !!state.authTokens.twitch }
    );
  } catch (error) {
    logger.log(
      'warn', 'canales', 'canales/twitch/oauth/auth-tokens-store.js#loadAuthTokens', 'canales.twitch_oauth.tokens_carga_fallida',
      `No se pudo cargar auth-tokens.json: ${error.message}`, { path: AUTH_TOKENS_FILE, error: error.message }
    );
  }
}

module.exports = { saveAuthTokens, loadAuthTokens, AUTH_TOKENS_FILE };
