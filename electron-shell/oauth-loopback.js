'use strict';

// Baile OAuth compartido por Google/Twitch/Kick (ver docs/plan-google-auth.md
// y docs/plan-twitch-kick.md): abre el navegador del sistema (los proveedores
// bloquean el consent screen dentro de un WebView embebido) y espera el
// redirect en un server HTTP loopback efimero.
//
// `puerto: 0` deja que el SO elija uno libre (Google acepta cualquier puerto
// en apps de escritorio); Twitch/Kick exigen un puerto FIJO, registrado de
// antemano en su panel de desarrollador — nunca puerto dinamico para esos dos.

const http = require('http');
const { shell } = require('electron');
const { construirPaginaCallback } = require('./oauth-callback-page');

const TIMEOUT_MS = 5 * 60 * 1000;
const HTML_LISTO = '<html><body style="font:16px system-ui;text-align:center;margin-top:20vh">Listo, pod&eacute;s cerrar esta pesta&ntilde;a.</body></html>';

/**
 * `construirAuthUrl(redirectUri)` recibe el redirect_uri ya armado (con el
 * puerto real, sea fijo o el que elija el SO) y devuelve la URL completa de
 * autorizacion para abrir en el navegador. Devuelve {code, redirectUri}.
 *
 * `plataforma` ('google' | 'twitch' | 'kick') es opcional: si viene, la
 * pagina final es la de marca TikLive (oauth-callback-page.js, se cierra sola
 * a los 5 s); si no, queda el HTML_LISTO de siempre.
 */
function autenticarConLoopback({ puerto = 0, host = '127.0.0.1', construirAuthUrl, plataforma }) {
  return new Promise((resolve, reject) => {
    let redirectUri;

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${host}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      if (plataforma) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(construirPaginaCallback({
          plataforma,
          estado: !error && code ? 'ok' : 'error',
          idioma: req.headers['accept-language'],
        }));
      } else {
        res.end(HTML_LISTO);
      }
      server.close();
      if (error) return reject(new Error(error));
      if (!code) return reject(new Error('no se recibio code'));
      resolve({ code, redirectUri });
    });

    server.listen(puerto, '127.0.0.1', () => {
      redirectUri = `http://${host}:${server.address().port}`;
      shell.openExternal(construirAuthUrl(redirectUri));
    });

    setTimeout(() => { server.close(); reject(new Error('timeout')); }, TIMEOUT_MS);
  });
}

module.exports = { autenticarConLoopback };
