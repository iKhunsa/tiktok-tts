'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const accountData = require('../core/account-data-path');

test('cada cuenta resuelve un directorio estable y sin PII', () => {
  accountData.setActiveAccount('user-a@example.com');
  const a = accountData.accountDataDir();
  accountData.setActiveAccount('user-b@example.com');
  const b = accountData.accountDataDir();
  accountData.setActiveAccount('user-a@example.com');
  assert.equal(accountData.accountDataDir(), a);
  assert.notEqual(a, b);
  assert.equal(a.includes('user-a@example.com'), false);
});
