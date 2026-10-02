'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { DATA_BASE } = require('./paths');

let accountId = 'anonymous';

function safeAccountId(id) {
  if (id == null || id === '') return 'anonymous';
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 24);
}

function setActiveAccount(id) {
  accountId = id == null || id === '' ? 'anonymous' : String(id);
  const dir = accountDataDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getActiveAccount() { return accountId; }
function accountDataDir() { return path.join(DATA_BASE, 'accounts', safeAccountId(accountId)); }
function accountDataPath(...parts) { return path.join(accountDataDir(), ...parts); }

// Borra la carpeta de una cuenta (eliminacion de cuenta). Ruta derivada solo del
// hash del id, nunca de texto libre.
function removeAccountData(id) {
  fs.rmSync(path.join(DATA_BASE, 'accounts', safeAccountId(id)), { recursive: true, force: true });
}

function attachAccountDataPath(bus) {
  bus.on('account:changed', ({ current }) => setActiveAccount(current), 'core');
  setActiveAccount(accountId);
}

module.exports = { safeAccountId, setActiveAccount, getActiveAccount, accountDataDir, accountDataPath, removeAccountData, attachAccountDataPath };
