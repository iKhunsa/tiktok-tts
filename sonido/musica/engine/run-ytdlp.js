'use strict';

const { spawnChild } = require('./spawn-child');

const STDERR_TAIL_MAX = 4096;

function runYtdlp(state, args, { timeoutMs = 25000 } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawnChild(state, args);
    } catch (err) {
      return resolve({ code: -1, stdout: '', stderr: err.message });
    }
    let stdout = '';
    let stderr = '';
    let done = false;
    const finish = (result) => { if (!done) { done = true; clearTimeout(timer); resolve(result); } };
    const timer = setTimeout(() => {
      try { child.kill(); } catch (_) { /* best-effort */ }
      finish({ code: -1, stdout, stderr: `timeout tras ${timeoutMs}ms` });
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-STDERR_TAIL_MAX); });
    child.on('error', (err) => finish({ code: -1, stdout, stderr: err.message }));
    child.on('close', (code) => finish({ code, stdout, stderr }));
  });
}

module.exports = { runYtdlp, STDERR_TAIL_MAX };
