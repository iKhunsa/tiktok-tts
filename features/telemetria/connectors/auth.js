'use strict';

// Cuantos usuarios no pueden hablar con servicio-cuentas, y por que. No
// cambia nada de /auth (reaprovecha el espejo generico log:entry, igual que
// obs.js) — sin esto, el unico rastro de "Servicio de cuentas no disponible"
// era un issue de GlitchTip por instalacion afectada, sin forma de saber
// cuantas hay ni si la causa es la misma (ej. un ISP bloqueando el dominio)
// en todas.
//
// `causa` llega como la vio propagarError/refresh.js: un `.cause.code` de
// red (Node/undici) si hubo excepcion, o el mensaje crudo si fue un 5xx
// agotando reintentos. Se clasifica en baldes amplios porque el valor
// textual exacto varia entre Node/Electron y no vale la pena granularlo mas:
//  - 'dns'                 : el dominio no resuelve -> tipico de un ISP que
//                             hace DNS hijacking/NXDOMAIN al bloquear un sitio.
//  - 'conexion_reiniciada' : el handshake se corta a mitad -> tipico de DPI
//                             (inspeccion profunda de paquetes) resiliente.
//  - 'timeout'              : no hay respuesta en el plazo -> puede ser el
//                             ISP tirando paquetes en silencio o el servicio
//                             lento; ambiguo a proposito, no se fuerza.
//  - 'conexion_rechazada'  : el host contesto "no" activamente -> casi
//                             siempre el lado del servidor/firewall, no el ISP.
//  - 'certificado'          : TLS/cert -> maquina del usuario (reloj, antivirus
//                             con inspeccion SSL), no la red en si.
//  - 'servidor_5xx'         : el servicio respondio pero mal -> culpa nuestra.
//  - 'desconocido'          : no hay causa (ej. auth.servicio.sin_respuesta
//                             viejo sin .error, o un texto no reconocido).
const DNS = ['ENOTFOUND', 'EAI_AGAIN', 'ENODATA'];
const RESET = ['ECONNRESET', 'EPIPE', 'EPROTO'];
const TIMEOUT = ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'];
const RECHAZADA = ['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'];
const CERTIFICADO = [
  'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN', 'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_UNTRUSTED', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
];

function clasificarCausa(causaCruda) {
  if (!causaCruda || typeof causaCruda !== 'string') return 'desconocido';
  const c = causaCruda.toUpperCase();
  if (DNS.some((code) => c.includes(code))) return 'dns';
  if (RESET.some((code) => c.includes(code))) return 'conexion_reiniciada';
  if (RECHAZADA.some((code) => c.includes(code))) return 'conexion_rechazada';
  if (CERTIFICADO.some((code) => c.includes(code))) return 'certificado';
  // AbortSignal.timeout propio (cliente-servicio.js, 15s): el error no trae
  // un codigo de red, el mensaje dice "aborted"/"timeout" segun la version de Node.
  if (TIMEOUT.some((code) => c.includes(code)) || c.includes('ABORT') || c.includes('TIMEOUT')) return 'timeout';
  if (/SERVICIO-CUENTAS \d{3}/.test(c)) return 'servidor_5xx';
  return 'desconocido';
}

function attach(bus, track) {
  bus.on('log:entry', (entry) => {
    if (!entry || entry.domain !== 'auth') return;
    if (entry.event !== 'auth.servicio.error' && entry.event !== 'auth.servicio.sin_respuesta') return;
    const causa = clasificarCausa(entry.data && entry.data.causa);
    // 'accion': el usuario estaba haciendo algo (login, registro, cambiar
    // perfil...) y le salto el error en el momento. 'fondo': lo detecto el
    // refresh periodico de 10 min, con sesion ya iniciada -- son los
    // usuarios que YA entraron alguna vez y despues se quedaron sin acceso,
    // a diferencia de alguien que nunca pudo ni loguearse.
    track('auth', 'servicio_no_disponible', {
      causa,
      origen: entry.event === 'auth.servicio.error' ? 'accion' : 'fondo',
    });
  });
}

module.exports = { name: 'auth', attach, clasificarCausa };
