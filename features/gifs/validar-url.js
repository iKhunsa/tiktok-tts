'use strict';

const dns = require('dns').promises;
const net = require('net');

const MAX_URL = 2048;

function esIpPrivada(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const bajo = ip.toLowerCase();
  if (bajo.startsWith('::ffff:')) return esIpPrivada(bajo.slice(7));
  return bajo === '::1' || bajo === '::' || bajo.startsWith('fc') || bajo.startsWith('fd') || bajo.startsWith('fe80');
}

/**
 * Una URL de medio es valida si es http(s) y su servidor es publico: este endpoint lo puede alcanzar
 * cualquiera en la red local (panel remoto), asi que no puede servir para sondear la red interna.
 * Devuelve la URL normalizada o lanza Error con `codigo`.
 */
async function validarUrl(entrada, { resolver = dns.lookup } = {}) {
  const falla = (codigo) => Object.assign(new Error(codigo), { codigo });
  if (typeof entrada !== 'string' || entrada.length > MAX_URL) throw falla('url_invalida');
  let url;
  try { url = new URL(entrada.trim()); } catch (_) { throw falla('url_invalida'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw falla('url_invalida');
  if (url.username || url.password) throw falla('url_invalida');
  url.hash = '';
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) throw falla('url_privada');
  const direcciones = net.isIP(host) ? [{ address: host }] : await resolver(host, { all: true }).catch(() => { throw falla('url_inalcanzable'); });
  if (direcciones.some(({ address }) => esIpPrivada(address))) throw falla('url_privada');
  return url.href;
}

module.exports = { validarUrl, esIpPrivada };
