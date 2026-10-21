/**
 * Vista "Cuenta": registro / login / perfil / plan. Espejo del patron de
 * mcp/index.js — el panel se pinta al entrar a la vista y tras cada cambio
 * de sesion. Toda la logica de plan/entitlements vive en el server
 * (features/auth/); aca solo se refleja el estado y se disparan acciones.
 */
import { t, aplicarTraducciones, idiomaActual } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { almacenSesion, aplicarSesion, pintarBadgeSidebar } from '../../../nucleo/estado/sesion.js';
import { borrarDatosDeCuenta } from '../../../nucleo/estado/datos-por-cuenta.js';
import { guardarAvatarPerfil, obtenerAvatarPerfil, quitarAvatarPerfil } from '../../../nucleo/estado/avatar-perfil.js';
import { pedir, toastError } from './api.js';
import { abrirModalEliminarCuenta } from './modal-eliminar-cuenta.js';
import { abrirPopupPlanes } from '../../../componentes/popup-planes.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';
import { avisoRegistroHtml } from './aviso-registro-html.js';
import { enlazarAvisoRegistro } from './enlazar-aviso-registro.js';
import { autenticarConGoogleUI, autenticarConTwitchUI, autenticarConKickUI } from './plataforma-auth-cliente.js';

// La sesion pasa a anonymous y la ventana se recarga: el aviso sobrevive al reload.
const AVISO_CUENTA_ELIMINADA = 'tikliveTTS_cuentaEliminada';

let modo = 'login'; // 'login' | 'register' — solo cuando esta deslogueado

function campo({ id, labelKey, type = 'text', autocomplete, required }) {
  return `
    <div class="cuenta-field">
      <label for="${id}" data-i18n="${labelKey}"></label>
      <input type="${type}" id="${id}"${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${required ? ' required' : ''}>
    </div>`;
}

function botonGoogle(labelKey) {
  return `
    <button type="button" class="cuenta-btn-google" id="cuentaGoogleBtn">
      <img class="icon-inline" src="icons/google.svg" alt="">
      <span data-i18n="${labelKey}"></span>
    </button>`;
}

// Registro nuevo = solo Google (el endpoint de email+password sigue vivo en
// el backend por compatibilidad, pero la UI ya no lo ofrece para cuentas
// nuevas). Login mantiene el formulario existente intacto, sumando Google
// como segundo camino.
function formAuth() {
  const esReg = modo === 'register';
  return `
    <div class="cuenta-card cuenta-auth">
      <h3 class="cuenta-card-title" data-i18n="${esReg ? 'cuenta.registerTitle' : 'cuenta.loginTitle'}"></h3>
      <p class="cuenta-card-sub" data-i18n="${esReg ? 'cuenta.registerSub' : 'cuenta.loginSub'}"></p>

      ${esReg ? '' : `
      <form id="cuentaForm" novalidate>
        ${campo({ id: 'cuentaEmail', labelKey: 'cuenta.email', type: 'email', autocomplete: 'email', required: true })}
        ${campo({ id: 'cuentaPass', labelKey: 'cuenta.password', type: 'password', autocomplete: 'current-password', required: true })}
        <button type="submit" class="cuenta-btn-primary" id="cuentaSubmit" data-i18n="cuenta.doLogin"></button>
      </form>
      <div class="cuenta-divider" data-i18n="cuenta.or"></div>`}

      ${botonGoogle(esReg ? 'cuenta.registerWithGoogle' : 'cuenta.loginWithGoogle')}
      ${esReg ? avisoRegistroHtml(true) : ''}

      <button type="button" class="cuenta-switch" id="cuentaSwitch">
        <span data-i18n="${esReg ? 'cuenta.haveAccountQ' : 'cuenta.noAccountQ'}"></span>
        <b data-i18n="${esReg ? 'cuenta.doLogin' : 'cuenta.doRegister'}"></b>
      </button>

      ${esReg ? `<p class="cuenta-legal" data-i18n="cuenta.legal"></p>` : ''}
    </div>`;
}

// Intervalo de facturacion del plan de pago: el anual se puede pasar a mensual
// en la proxima renovacion (sin reembolso, el periodo pagado se cumple completo).
function intervaloBlock(sub, hasta) {
  if (!sub.interval) return '';
  const intervaloKey = sub.interval === 'month' ? 'cuenta.intervalMonthly' : 'cuenta.intervalYearly';
  let detalle = '';
  if (sub.nextInterval === 'month') {
    detalle = `<p class="cuenta-hint">${esc(t('cuenta.changesAt', { fecha: hasta }))}</p>`;
  } else if (sub.interval === 'year' && !sub.cancelAtPeriodEnd) {
    detalle = `<button class="cuenta-btn-ghost" id="cuentaSwitchMonthly" data-i18n="cuenta.switchToMonthly"></button>
      <p class="cuenta-hint" data-i18n="cuenta.switchNote"></p>`;
  }
  return `<div class="cuenta-plan-interval"><p class="cuenta-hint" data-i18n="${intervaloKey}"></p>${detalle}</div>`;
}

function planCard(s) {
  const esPro = s.plan === 'pro';
  const esSinPromos = s.plan === 'sin-promos';
  const sub = s.subscription || {};
  const hasta = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '';
  let estado;
  if (esPro && sub.cancelAtPeriodEnd) estado = t('cuenta.planProCancels', { fecha: hasta });
  else if (esPro) estado = t('cuenta.planProUntil', { fecha: hasta });
  else if (esSinPromos && sub.cancelAtPeriodEnd) estado = t('cuenta.planSinPromosCancels', { fecha: hasta });
  else if (esSinPromos) estado = t('cuenta.planSinPromosDesc');
  else estado = t('cuenta.planFreeDesc');

  return `
    <div class="cuenta-card cuenta-plan${esPro ? ' is-pro' : esSinPromos ? ' is-sin-promos' : ''}">
      <div class="cuenta-plan-head">
        <img class="icon-inline" src="icons/workspace_premium.svg" alt="">
        <div>
          <div class="cuenta-plan-name">${esPro ? 'Pro' : esSinPromos ? t('cuenta.planSinPromosName') : t('cuenta.planFree')}</div>
          <div class="cuenta-plan-state">${esc(estado)}</div>
        </div>
      </div>
      ${s.degraded ? `<p class="cuenta-hint" data-i18n="cuenta.degraded"></p>` : ''}
      ${esPro || esSinPromos ? intervaloBlock(sub, hasta) : ''}
      ${esPro
    ? (sub.cancelAtPeriodEnd
      ? `<button class="cuenta-btn-primary" id="cuentaResume" data-i18n="cuenta.resume"></button>`
      : `<button class="cuenta-btn-ghost" id="cuentaManage" data-i18n="cuenta.manage"></button>`)
    : esSinPromos
      ? (sub.cancelAtPeriodEnd
        ? `<button class="cuenta-btn-primary" id="cuentaResume" data-i18n="cuenta.resume"></button>`
        : `<div class="cuenta-perfil-acciones">
            <button class="cuenta-btn-primary" id="cuentaUpgrade" data-i18n="cuenta.upgradeToPro"></button>
            <button class="cuenta-btn-ghost" id="cuentaManage" data-i18n="cuenta.manage"></button>
          </div>`)
      : `<button class="cuenta-btn-primary" id="cuentaUpgrade" data-i18n="cuenta.goPro"></button>`}
    </div>`;
}

function panelPerfil(s) {
  const u = s.user || {};
  const inicial = esc((u.nombre || u.email || '?').trim().charAt(0).toUpperCase());
  return `
    <div class="cuenta-card cuenta-perfil">
      <div class="cuenta-perfil-head">
        <div class="cuenta-avatar" role="button" tabindex="0" data-inicial="${inicial}">${inicial}</div>
        <input type="file" id="cuentaAvatarInput" accept="image/png,image/jpeg,image/webp" hidden>
        <div class="cuenta-perfil-id">
          <div class="cuenta-perfil-nombre">${esc(u.nombre) || t('cuenta.noName')}</div>
          <div class="cuenta-perfil-email">${esc(u.email)}</div>
          <div class="cuenta-identidad-google" id="cuentaIdentidadGoogle"></div>
        </div>
      </div>
      <div class="cuenta-field">
        <label for="cuentaNombre" data-i18n="cuenta.name"></label>
        <input type="text" id="cuentaNombre" autocomplete="name" value="${esc(u.nombre)}">
      </div>
      <div class="cuenta-perfil-acciones">
        <button class="cuenta-btn-ghost" id="cuentaElegirAvatar" data-i18n="cuenta.changePhoto"></button>
        <button class="cuenta-btn-ghost" id="cuentaQuitarAvatar" data-i18n="cuenta.removePhoto"></button>
        <button class="cuenta-btn-ghost" id="cuentaGuardarNombre" data-i18n="cuenta.save"></button>
        <button class="cuenta-btn-ghost cuenta-btn-danger" id="cuentaLogout" data-i18n="cuenta.logout"></button>
      </div>
    </div>
    ${planCard(s)}
    <div class="cuenta-danger-zone">
      <p class="cuenta-hint" data-i18n="cuenta.deleteHint"></p>
      <button class="cuenta-btn-ghost cuenta-btn-danger" id="cuentaEliminar" data-i18n="cuenta.deleteAccount"></button>
    </div>`;
}

export function renderCuentaPanel() {
  const el = document.getElementById('cuentaPanel');
  if (!el) return;
  const s = almacenSesion.getState();

  if (!s.activo) {
    el.innerHTML = `<div class="cuenta-card"><p class="cuenta-hint" data-i18n="cuenta.inactive"></p></div>`;
    aplicarTraducciones(el);
    return;
  }

  el.innerHTML = s.signedIn ? panelPerfil(s) : formAuth();
  aplicarTraducciones(el);
  enlazarAvisoRegistro({ raiz: el, idioma: idiomaActual() });

  if (!s.signedIn) {
    el.querySelector('#cuentaSwitch').addEventListener('click', () => {
      modo = modo === 'login' ? 'register' : 'login';
      renderCuentaPanel();
    });
    el.querySelector('#cuentaForm')?.addEventListener('submit', (e) => { e.preventDefault(); enviarAuth(el); });
    el.querySelector('#cuentaGoogleBtn').addEventListener('click', () => enviarGoogle(el));
    el.querySelector('input')?.focus();
    return;
  }

  const u = s.user || {};
  cargarIdentidadGoogle(el, u);

  const avatar = el.querySelector('.cuenta-avatar');
  const inputAvatar = el.querySelector('#cuentaAvatarInput');
  const pintarAvatar = (foto = obtenerAvatarPerfil()) => {
    avatar.replaceChildren();
    if (foto) {
      const img = document.createElement('img');
      img.src = foto;
      img.alt = '';
      avatar.appendChild(img);
    } else avatar.textContent = avatar.dataset.inicial;
    avatar.classList.toggle('has-image', !!foto);
    el.querySelector('#cuentaQuitarAvatar').hidden = !foto;
  };
  avatar.setAttribute('aria-label', t('cuenta.changePhoto'));
  pintarAvatar();
  const elegirAvatar = () => inputAvatar.click();
  avatar.addEventListener('click', elegirAvatar);
  avatar.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirAvatar(); } });
  el.querySelector('#cuentaElegirAvatar').addEventListener('click', elegirAvatar);
  inputAvatar.addEventListener('change', async () => {
    try {
      const foto = await guardarAvatarPerfil(inputAvatar.files[0]);
      pintarAvatar(foto);
      pintarBadgeSidebar();
    } catch (_) {
      showToast(t('cuenta.photoError'));
    } finally {
      inputAvatar.value = '';
    }
  });
  el.querySelector('#cuentaQuitarAvatar').addEventListener('click', () => {
    quitarAvatarPerfil();
    pintarAvatar();
    pintarBadgeSidebar();
  });

  el.querySelector('#cuentaLogout').addEventListener('click', async () => {
    await pedir('/api/auth/logout', { method: 'POST' });
    aplicarSesion({ activo: true, signedIn: false });
    renderCuentaPanel();
  });
  el.querySelector('#cuentaGuardarNombre').addEventListener('click', async () => {
    const nombre = el.querySelector('#cuentaNombre').value.trim();
    const r = await pedir('/api/account', { method: 'PATCH', body: { nombre } });
    if (!r.ok) return toastError(r.body);
    aplicarSesion(r.body);
    showToast(t('cuenta.saved'));
    renderCuentaPanel();
  });
  el.querySelector('#cuentaEliminar').addEventListener('click', async () => {
    const lista = await listaIdentidades();
    abrirModalEliminarCuenta({
      hasPassword: u.hasPassword !== false,
      googleLinked: lista.includes('google'),
      eliminar: eliminarCuenta,
      eliminarGoogle: eliminarCuentaGoogle,
    });
  });
  el.querySelector('#cuentaUpgrade')?.addEventListener('click', () => abrirPopupPlanes());
  el.querySelector('#cuentaManage')?.addEventListener('click', (e) => cancelarSuscripcion(e.currentTarget));
  el.querySelector('#cuentaResume')?.addEventListener('click', (e) => reanudarSuscripcion(e.currentTarget));
  el.querySelector('#cuentaSwitchMonthly')?.addEventListener('click', (e) => pasarAMensual(e.currentTarget));
}

// El registro nuevo es solo Google (ver formAuth); este formulario con
// password solo sobrevive para el login.
async function enviarAuth(el) {
  const email = (el.querySelector('#cuentaEmail')?.value || '').trim();
  const password = el.querySelector('#cuentaPass').value;
  const btn = el.querySelector('#cuentaSubmit');

  btn.disabled = true;
  try {
    const r = await pedir('/api/auth/login', { method: 'POST', body: { email, password } });
    if (!r.ok) return toastError(r.body, 'errors.invalidCredentials');
    aplicarSesion(r.body);
    renderCuentaPanel();
  } finally {
    btn.disabled = false;
  }
}

// Login y registro comparten el mismo endpoint y el mismo manejo de
// respuesta: 409 (email ya registrado con password) manda a login; el resto
// de los errores (400 token/email no verificado, 501 sin Google en el
// backend) solo muestra el toast y deja reintentar en la misma pantalla.
async function enviarGoogle(el) {
  const btn = el.querySelector('#cuentaGoogleBtn');
  btn.disabled = true;
  try {
    const datos = await autenticarConGoogleUI();
    if (!datos) return;
    const r = await pedir('/api/auth/google', { method: 'POST', body: datos });
    if (!r.ok) {
      toastError(r.body, 'errors.generic');
      if (r.status === 409) { modo = 'login'; renderCuentaPanel(); }
      return;
    }
    aplicarSesion(r.body);
    renderCuentaPanel();
  } finally {
    btn.disabled = false;
  }
}

async function listaIdentidades() {
  const r = await pedir('/api/account/identities');
  if (!r.ok) return [];
  return Array.isArray(r.body) ? r.body : (r.body.identities || []);
}

// Pinta "Google vinculado (email)" o el boton para vincularlo, segun el
// estado real del backend (no basta con saber si hay password: la cuenta
// pudo crearse por password y vincular Google despues, o al reves).
async function cargarIdentidadGoogle(el, u) {
  const cont = el.querySelector('#cuentaIdentidadGoogle');
  if (!cont) return;
  const lista = await listaIdentidades();
  if (!cont.isConnected) return; // la vista cambio mientras pedia
  if (lista.includes('google')) {
    cont.innerHTML = `<span class="cuenta-identidad-badge"><img class="icon-inline" src="icons/google.svg" alt="">${esc(t('cuenta.googleLinked', { email: u.email || '' }))}</span>`;
    return;
  }
  cont.innerHTML = `<button type="button" class="cuenta-btn-ghost cuenta-btn-icon" id="cuentaLinkGoogle"><img class="icon-inline" src="icons/google.svg" alt="">${esc(t('cuenta.linkGoogle'))}</button>`;
  cont.querySelector('#cuentaLinkGoogle').addEventListener('click', () => vincularGoogle(el, u));
}

async function vincularGoogle(el, u) {
  const btn = el.querySelector('#cuentaLinkGoogle');
  if (btn) btn.disabled = true;
  const datos = await autenticarConGoogleUI();
  if (!datos) { if (btn) btn.disabled = false; return; }
  const r = await pedir('/api/account/link/google', { method: 'POST', body: datos });
  if (!r.ok) {
    toastError(r.body, 'errors.generic');
    if (btn) btn.disabled = false;
    return;
  }
  showToast(t('cuenta.googleLinkedDone'));
  cargarIdentidadGoogle(el, u);
}

// Modal propio (mismo patron visual que modWipeConfirmModal en index.html) en
// vez de confirm() nativo — un dialogo de navegador desentona con el resto
// de la app.
function modalConfirmarCancelacion() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-content cuenta-cancel-modal">
        <button class="modal-close" type="button" id="modal-close"><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <div class="cuenta-cancel-copy">
          <div class="notice-icon-badge"><span class="icon-inline notice-icon-warn" aria-hidden="true"></span></div>
          <h2>${esc(t('cuenta.confirmCancelTitle')).replace(' ', '<br>')}</h2>
          <p class="cuenta-cancel-description">${esc(t('cuenta.confirmCancel'))}</p>
          <button class="btn btn-connect cuenta-cancel-confirm" type="button" id="cuentaCancelYes">${esc(t('cuenta.confirmCancelYes'))}</button>
          <button class="btn btn-disconnect cuenta-cancel-back" type="button" id="cuentaCancelNo">${esc(t('cuenta.confirmCancelNo'))}</button>
          <p class="cuenta-cancel-notice"><img class="icon-inline" src="icons/lock.svg" alt="">${esc(t('cuenta.confirmCancelNotice'))}</p>
        </div>
        <div class="cuenta-cancel-image"><img src="img/mascota/michi-triste.png" alt=""></div>
      </div>`;
    document.body.appendChild(overlay);
    const cerrar = (resultado) => { overlay.remove(); resolve(resultado); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(false); });
    overlay.querySelector('.modal-close').addEventListener('click', () => cerrar(false));
    overlay.querySelector('#cuentaCancelNo').addEventListener('click', () => cerrar(false));
    overlay.querySelector('#cuentaCancelYes').addEventListener('click', () => cerrar(true));
  });
}

async function cancelarSuscripcion(btn) {
  const confirmado = await modalConfirmarCancelacion();
  if (!confirmado) return;
  btn.disabled = true;
  try {
    const r = await pedir('/api/auth/subscription/cancel', { method: 'POST' });
    if (!r.ok) return toastError(r.body);
    aplicarSesion(r.body);
    showToast(t('cuenta.canceled'));
    renderCuentaPanel();
  } finally {
    btn.disabled = false;
  }
}

// Reanudar es una accion positiva (deshace una cancelacion pendiente,
// todavia dentro del periodo pagado) -> sin modal de confirmacion, solo
// el toast de resultado.
async function reanudarSuscripcion(btn) {
  btn.disabled = true;
  try {
    const r = await pedir('/api/auth/subscription/resume', { method: 'POST' });
    if (!r.ok) return toastError(r.body);
    aplicarSesion(r.body);
    showToast(t('cuenta.resumed'));
    renderCuentaPanel();
  } finally {
    btn.disabled = false;
  }
}

// Polar puede no soportar el cambio (501 errors.notImplemented): toastError lo
// muestra y la vista queda como estaba.
async function pasarAMensual(btn) {
  btn.disabled = true;
  try {
    const r = await pedir('/api/auth/subscription/change-interval', { method: 'POST', body: { intervalo: 'month' } });
    if (!r.ok) return toastError(r.body);
    aplicarSesion(r.body);
    showToast(t('cuenta.switchRequested'));
    renderCuentaPanel();
  } finally {
    btn.disabled = false;
  }
}

// El backend borra todo y la app cierra sesion y limpia sus datos locales; aca
// solo se limpia lo del renderer (antes de pasar a anonymous) y se avisa.
function finalizarBorradoCuenta() {
  try { sessionStorage.setItem(AVISO_CUENTA_ELIMINADA, '1'); } catch (_) { /* sin storage: no hay aviso */ }
  borrarDatosDeCuenta();
  aplicarSesion({ activo: true, signedIn: false });
  renderCuentaPanel();
}

async function eliminarCuenta(password) {
  const r = await pedir('/api/account', { method: 'DELETE', body: { password } });
  if (!r.ok) {
    toastError(r.body);
    return false;
  }
  finalizarBorradoCuenta();
  return true;
}

// Mismo endpoint que eliminarCuenta, distinto cuerpo: el backend acepta
// {password} o {code, codeVerifier, redirectUri} para confirmar el borrado.
async function eliminarCuentaGoogle(datos) {
  const r = await pedir('/api/account', { method: 'DELETE', body: datos });
  if (!r.ok) {
    toastError(r.body);
    return false;
  }
  finalizarBorradoCuenta();
  return true;
}

function mostrarAvisoCuentaEliminada() {
  try {
    if (!sessionStorage.getItem(AVISO_CUENTA_ELIMINADA)) return;
    sessionStorage.removeItem(AVISO_CUENTA_ELIMINADA);
    showToast(t('cuenta.deleteDone'));
  } catch (_) { /* sin storage */ }
}

/** Muestra/oculta el item de sidebar y re-pinta si la vista esta abierta. */
export function iniciarCuenta() {
  const sync = () => {
    const s = almacenSesion.getState();
    const btn = document.querySelector('.sidebar-item[data-view="cuenta"]');
    if (btn) btn.hidden = !s.activo;
    if (document.getElementById('view-cuenta')?.classList.contains('active')) renderCuentaPanel();
  };
  almacenSesion.subscribe(sync);
  sync();
  // Tras la recarga el diccionario carga async: esperar antes de traducir.
  Promise.resolve(window.__langReady).then(mostrarAvisoCuentaEliminada);
}
