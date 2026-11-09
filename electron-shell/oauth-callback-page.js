'use strict';

// Pagina que ve el usuario en el navegador del sistema cuando vuelve del
// login/vinculacion OAuth (la sirve el server loopback de oauth-loopback.js).
// Es autocontenida (CSS, logo y JS inline): el server loopback se cierra tras
// la primera respuesta, asi que no puede servir archivos aparte.
//
// Estilo: tokens de interfaz/STYLEGUIDE.md (--bg, --surface, --border, --ok,
// --brand, radios, Inter). No se refleja NADA de la query string en el HTML
// (el `error` del redirect lo controla quien arme la URL): los textos salen
// solo de las tablas de abajo.

const CIERRE_SEGUNDOS = 5;

const PLATAFORMAS = {
  twitch: { nombre: 'Twitch', color: '#9146ff' },
  kick: { nombre: 'Kick', color: '#53fc18' },
  // Google es inicio de sesion, no vinculacion: usa los textos `login*`.
  google: { nombre: 'Google', color: '#4285f4', login: true },
};

const TEXTOS = {
  es: {
    okTitulo: '¡Cuenta conectada!',
    okCuerpo: (p) => `Tu cuenta de ${p} quedó vinculada a TikLive TTS. Ya podés volver a la app.`,
    errTitulo: 'No se pudo conectar',
    errCuerpo: (p) => `No pudimos vincular tu cuenta de ${p}. Volvé a la app e intentalo de nuevo.`,
    loginOkTitulo: '¡Sesión iniciada!',
    loginOkCuerpo: (p) => `Entraste con ${p}. Ya podés volver a la app.`,
    loginErrCuerpo: (p) => `No pudimos iniciar sesión con ${p}. Volvé a la app e intentalo de nuevo.`,
    cuenta: (s) => `Esta pestaña se cierra sola en ${s} s`,
    manual: 'Ya podés cerrar esta pestaña.',
    boton: 'Cerrar pestaña',
  },
  en: {
    okTitulo: 'Account connected!',
    okCuerpo: (p) => `Your ${p} account is now linked to TikLive TTS. You can go back to the app.`,
    errTitulo: 'Could not connect',
    errCuerpo: (p) => `We couldn't link your ${p} account. Go back to the app and try again.`,
    loginOkTitulo: 'Signed in!',
    loginOkCuerpo: (p) => `You signed in with ${p}. You can go back to the app.`,
    loginErrCuerpo: (p) => `We couldn't sign you in with ${p}. Go back to the app and try again.`,
    cuenta: (s) => `This tab closes automatically in ${s}s`,
    manual: 'You can close this tab now.',
    boton: 'Close tab',
  },
};

// Logo de interfaz/publico/logo-icon.svg (viewBox recortado al dibujo).
const LOGO = '<svg width="44" height="28" viewBox="100 262 880 550" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M361.889 276.361C350.488 282.602 114.019 518.683 107.767 529.697C100.412 544.016 101.515 556.499 111.445 568.248L120.271 578.529L208.901 579.63L297.163 580.732L306.725 591.746L315.919 603.128V694.916V786.706L326.584 797.353C334.307 804.694 340.927 808 349.385 808C360.418 808 373.657 795.882 492.443 677.66C610.862 559.804 624.837 547.32 635.501 547.32C643.958 547.32 650.582 550.625 658.302 557.968L668.966 568.616V677.66V786.706L679.634 797.353C687.354 804.694 693.978 808 702.435 808C713.467 808 726.337 796.251 844.755 678.395C916.102 607.534 975.311 545.485 976.416 540.712C977.886 536.306 976.416 527.494 973.841 521.252C966.117 501.793 954.716 499.59 864.249 499.59C790.696 499.59 782.971 498.856 775.251 492.615C766.425 485.638 766.425 485.271 764.587 387.608L762.745 289.578L752.45 280.767C741.786 271.588 728.179 269.385 717.511 275.259C714.204 277.095 653.889 335.84 584.016 405.599C462.655 526.393 456.035 532.635 443.163 532.635C433.602 532.635 426.982 530.064 420.73 523.456L411.536 514.644V409.638C411.536 298.39 409.697 284.438 393.884 275.994C384.322 270.853 371.45 270.853 361.889 276.361Z" fill="#F0213A"/></svg>';

const ICONO_OK = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
const ICONO_ERROR = '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

function elegirIdioma(acceptLanguage) {
  return String(acceptLanguage || '').toLowerCase().startsWith('en') ? 'en' : 'es';
}

/**
 * @param {object} opts
 * @param {'twitch'|'kick'} opts.plataforma
 * @param {'ok'|'error'} opts.estado
 * @param {string} [opts.idioma]  header Accept-Language del request
 */
function construirPaginaCallback({ plataforma, estado, idioma }) {
  const p = PLATAFORMAS[plataforma] || { nombre: plataforma, color: '#898989' };
  const tx = TEXTOS[elegirIdioma(idioma)];
  const ok = estado === 'ok';
  const titulo = ok ? (p.login ? tx.loginOkTitulo : tx.okTitulo) : tx.errTitulo;
  const cuerpo = ok
    ? (p.login ? tx.loginOkCuerpo : tx.okCuerpo)(p.nombre)
    : (p.login ? tx.loginErrCuerpo : tx.errCuerpo)(p.nombre);

  // Solo se cierra sola cuando salio bien. En error la dejamos abierta.
  const aviso = ok
    ? `<p class="aviso" id="aviso">${tx.cuenta(CIERRE_SEGUNDOS)}</p>
       <div class="barra" aria-hidden="true"><div class="barra-fill" id="barra"></div></div>
       <button class="btn" type="button" id="cerrar">${tx.boton}</button>`
    : '';

  const script = ok
    ? `<script>
(function () {
  var segundos = ${CIERRE_SEGUNDOS};
  var aviso = document.getElementById('aviso');
  var barra = document.getElementById('barra');
  var boton = document.getElementById('cerrar');
  var textoManual = ${JSON.stringify(tx.manual)};
  var fraseCuenta = ${JSON.stringify(tx.cuenta('{s}'))};
  function cerrar() {
    try { window.close(); } catch (e) {}
    // Los navegadores solo dejan cerrar por script las pestanas abiertas por
    // script; si sigue aca, avisamos que la cierre a mano.
    setTimeout(function () { aviso.textContent = textoManual; boton.style.display = 'none'; }, 400);
  }
  requestAnimationFrame(function () { barra.style.width = '0%'; });
  var t = setInterval(function () {
    segundos -= 1;
    if (segundos <= 0) { clearInterval(t); cerrar(); return; }
    aviso.textContent = fraseCuenta.replace('{s}', segundos);
  }, 1000);
  boton.addEventListener('click', function () { clearInterval(t); cerrar(); });
})();
</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="${elegirIdioma(idioma)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>TikLive TTS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #171717; --surface: #1a1a1a; --border: #2e2e2e;
    --text: #fafafa; --text-secondary: #b4b4b4; --text-muted: #898989;
    --brand: #F0213A; --brand-hover: #d81830; --ok: #3ecf8e; --danger: #ef4444;
    --radius-lg: 16px; --radius-pill: 9999px;
    --plataforma: ${p.color};
    --estado: ${ok ? 'var(--ok)' : 'var(--danger)'};
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0; display: flex; align-items: center; justify-content: center; padding: 24px;
    background: var(--bg); color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  .card {
    width: 100%; max-width: 420px; text-align: center;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 40px 36px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
  }
  .logo { display: flex; justify-content: center; margin-bottom: 28px; }
  .icono {
    width: 56px; height: 56px; margin: 0 auto 20px; border-radius: var(--radius-pill);
    display: flex; align-items: center; justify-content: center;
    color: var(--estado); background: color-mix(in srgb, var(--estado) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--estado) 35%, transparent);
  }
  .plataforma {
    display: inline-flex; align-items: center; gap: 8px; margin-bottom: 14px;
    padding: 4px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill);
    font-size: 11px; font-weight: 600; letter-spacing: .4px; color: var(--text-secondary);
  }
  .plataforma i { width: 8px; height: 8px; border-radius: 50%; background: var(--plataforma); }
  h1 { margin: 0 0 10px; font-size: 22px; line-height: 28px; font-weight: 800; }
  p { margin: 0; }
  .cuerpo { font-size: 14px; line-height: 21px; color: var(--text-secondary); }
  .aviso { margin-top: 24px; font-size: 12px; color: var(--text-muted); }
  .barra { height: 3px; margin: 10px 0 20px; border-radius: var(--radius-pill); background: var(--border); overflow: hidden; }
  .barra-fill { height: 100%; width: 100%; background: var(--brand); transition: width ${CIERRE_SEGUNDOS}s linear; }
  .btn {
    width: 100%; padding: 12px 16px; border: 0; border-radius: var(--radius-pill);
    background: var(--brand); color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
    transition: background-color 200ms cubic-bezier(.22, .61, .36, 1);
  }
  .btn:hover { background: var(--brand-hover); }
  .btn:focus-visible { outline: 0; box-shadow: 0 0 0 3px rgba(240, 33, 58, 0.12), 0 0 0 1px var(--brand); }
  @media (prefers-reduced-motion: reduce) {
    .barra-fill, .btn { transition: none; }
  }
</style>
</head>
<body>
  <main class="card">
    <div class="logo">${LOGO}</div>
    <div class="icono">${ok ? ICONO_OK : ICONO_ERROR}</div>
    <div class="plataforma"><i></i>${p.nombre}</div>
    <h1>${titulo}</h1>
    <p class="cuerpo">${cuerpo}</p>
    ${aviso}
  </main>
${script}
</body>
</html>`;
}

module.exports = { construirPaginaCallback, CIERRE_SEGUNDOS };
