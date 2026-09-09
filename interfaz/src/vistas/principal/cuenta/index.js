/**
 * Vista "Cuenta": registro / login / perfil / plan. Espejo del patron de
 * mcp/index.js — el panel se pinta al entrar a la vista y tras cada cambio
 * de sesion. Toda la logica de plan/entitlements vive en el server
 * (features/auth/); aca solo se refleja el estado y se disparan acciones.
 */
import { t, tErr, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { almacenSesion, aplicarSesion } from '../../../nucleo/estado/sesion.js';

const MIN_PASS = 8;

async function pedir(path, opts) {
  const r = await fetch(path, {
    method: opts?.method || 'GET',
    headers: opts?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  let body = null;
  try { body = await r.json(); } catch (_) { /* sin cuerpo */ }
  return { ok: r.ok, status: r.status, body: body || {} };
}

function toastError(body, fallbackKey) {
  showToast(tErr(body, fallbackKey || 'errors.generic'));
}

// Escape para contexto de atributo (value="...") ademas de texto — el
// escaparHtml compartido no cubre las comillas. Local a esta vista.
const esc = (v) => String(v || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let modo = 'login'; // 'login' | 'register' — solo cuando esta deslogueado

function campo({ id, labelKey, type = 'text', autocomplete, required }) {
  return `
    <div class="cuenta-field">
      <label for="${id}" data-i18n="${labelKey}"></label>
      <input type="${type}" id="${id}"${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${required ? ' required' : ''}>
    </div>`;
}

function formAuth() {
  const esReg = modo === 'register';
  return `
    <div class="cuenta-card cuenta-auth">
      <h3 class="cuenta-card-title" data-i18n="${esReg ? 'cuenta.registerTitle' : 'cuenta.loginTitle'}"></h3>
      <p class="cuenta-card-sub" data-i18n="${esReg ? 'cuenta.registerSub' : 'cuenta.loginSub'}"></p>

      <form id="cuentaForm" novalidate>
        ${esReg ? campo({ id: 'cuentaNombre', labelKey: 'cuenta.name', autocomplete: 'name', required: true }) : ''}
        ${campo({ id: 'cuentaEmail', labelKey: 'cuenta.email', type: 'email', autocomplete: 'email', required: true })}
        ${esReg ? `
          <div class="cuenta-row">
            ${campo({ id: 'cuentaPass', labelKey: 'cuenta.password', type: 'password', autocomplete: 'new-password', required: true })}
            ${campo({ id: 'cuentaPass2', labelKey: 'cuenta.passwordConfirm', type: 'password', autocomplete: 'new-password', required: true })}
          </div>
          <p class="cuenta-hint" data-i18n="cuenta.passwordRule"></p>
        ` : campo({ id: 'cuentaPass', labelKey: 'cuenta.password', type: 'password', autocomplete: 'current-password', required: true })}

        <button type="submit" class="cuenta-btn-primary" id="cuentaSubmit" data-i18n="${esReg ? 'cuenta.doRegister' : 'cuenta.doLogin'}"></button>
      </form>

      <button type="button" class="cuenta-switch" id="cuentaSwitch">
        <span data-i18n="${esReg ? 'cuenta.haveAccountQ' : 'cuenta.noAccountQ'}"></span>
        <b data-i18n="${esReg ? 'cuenta.doLogin' : 'cuenta.doRegister'}"></b>
      </button>

      ${esReg ? `<p class="cuenta-legal" data-i18n="cuenta.legal"></p>` : ''}
    </div>`;
}

function planCard(s) {
  const esPro = s.plan === 'pro';
  const sub = s.subscription || {};
  const hasta = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '';
  let estado;
  if (esPro && sub.cancelAtPeriodEnd) estado = t('cuenta.planProCancels', { fecha: hasta });
  else if (esPro) estado = t('cuenta.planProUntil', { fecha: hasta });
  else estado = t('cuenta.planFreeDesc');

  return `
    <div class="cuenta-card cuenta-plan${esPro ? ' is-pro' : ''}">
      <div class="cuenta-plan-head">
        <img class="icon-inline" src="icons/workspace_premium.svg" alt="">
        <div>
          <div class="cuenta-plan-name">${esPro ? 'Pro' : t('cuenta.planFree')}</div>
          <div class="cuenta-plan-state">${esc(estado)}</div>
        </div>
      </div>
      ${s.degraded ? `<p class="cuenta-hint" data-i18n="cuenta.degraded"></p>` : ''}
      ${esPro
    ? (sub.cancelAtPeriodEnd
      ? `<button class="cuenta-btn-primary" id="cuentaResume" data-i18n="cuenta.resume"></button>`
      : `<button class="cuenta-btn-ghost" id="cuentaManage" data-i18n="cuenta.manage"></button>`)
    : `<button class="cuenta-btn-primary" id="cuentaUpgrade" data-i18n="cuenta.goPro"></button>`}
    </div>`;
}

function panelPerfil(s) {
  const u = s.user || {};
  const inicial = esc((u.nombre || u.email || '?').trim().charAt(0).toUpperCase());
  return `
    <div class="cuenta-card cuenta-perfil">
      <div class="cuenta-perfil-head">
        <div class="cuenta-avatar">${inicial}</div>
        <div class="cuenta-perfil-id">
          <div class="cuenta-perfil-nombre">${esc(u.nombre) || t('cuenta.noName')}</div>
          <div class="cuenta-perfil-email">${esc(u.email)}</div>
        </div>
      </div>
      <div class="cuenta-field">
        <label for="cuentaNombre" data-i18n="cuenta.name"></label>
        <input type="text" id="cuentaNombre" autocomplete="name" value="${esc(u.nombre)}">
      </div>
      <div class="cuenta-perfil-acciones">
        <button class="cuenta-btn-ghost" id="cuentaGuardarNombre" data-i18n="cuenta.save"></button>
        <button class="cuenta-btn-ghost cuenta-btn-danger" id="cuentaLogout" data-i18n="cuenta.logout"></button>
      </div>
    </div>
    ${planCard(s)}`;
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

  if (!s.signedIn) {
    el.querySelector('#cuentaSwitch').addEventListener('click', () => {
      modo = modo === 'login' ? 'register' : 'login';
      renderCuentaPanel();
    });
    el.querySelector('#cuentaForm').addEventListener('submit', (e) => { e.preventDefault(); enviarAuth(el); });
    el.querySelector('input')?.focus();
    return;
  }

  el.querySelector('#cuentaLogout').addEventListener('click', async () => {
    await pedir('/api/auth/logout', { method: 'POST' });
    aplicarSesion({ activo: true, signedIn: false });
    renderCuentaPanel();
  });
  el.querySelector('#cuentaGuardarNombre').addEventListener('click', async () => {
    const nombre = el.querySelector('#cuentaNombre').value.trim();
    const r = await pedir('/api/auth/account', { method: 'PATCH', body: { nombre } });
    if (!r.ok) return toastError(r.body);
    aplicarSesion(r.body);
    showToast(t('cuenta.saved'));
    renderCuentaPanel();
  });
  el.querySelector('#cuentaUpgrade')?.addEventListener('click', (e) => irACheckout(e.currentTarget));
  el.querySelector('#cuentaManage')?.addEventListener('click', (e) => cancelarSuscripcion(e.currentTarget));
  el.querySelector('#cuentaResume')?.addEventListener('click', (e) => reanudarSuscripcion(e.currentTarget));
}

async function enviarAuth(el) {
  const val = (id) => (el.querySelector('#' + id)?.value || '').trim();
  const email = val('cuentaEmail');
  const password = el.querySelector('#cuentaPass').value;
  const btn = el.querySelector('#cuentaSubmit');

  if (modo === 'register') {
    if (password.length < MIN_PASS) return toastError({}, 'errors.weakPassword');
    if (password !== el.querySelector('#cuentaPass2').value) return toastError({}, 'errors.passwordMismatch');
  }

  const body = { email, password };
  if (modo === 'register') body.nombre = val('cuentaNombre');

  btn.disabled = true;
  try {
    const r = await pedir(modo === 'register' ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body });
    if (!r.ok) return toastError(r.body, 'errors.invalidCredentials');
    aplicarSesion(r.body);
    renderCuentaPanel();
  } finally {
    btn.disabled = false;
  }
}

async function irACheckout(btn) {
  btn.disabled = true;
  try {
    const r = await pedir('/api/auth/checkout', { method: 'POST', body: { plan: 'pro' } });
    if (!r.ok || !r.body.url) return toastError(r.body);
    window.open(r.body.url, '_blank'); // window.js rebota la URL no-local al navegador externo
    showToast(t('cuenta.checkoutOpened'));
  } finally {
    btn.disabled = false;
  }
}

// Modal propio (mismo patron visual que modWipeConfirmModal en index.html) en
// vez de confirm() nativo — un dialogo de navegador desentona con el resto
// de la app.
function modalConfirmarCancelacion() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-content" style="text-align:center;">
        <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <div class="notice-icon-badge"><img class="icon-inline" src="icons/warning.svg" alt=""></div>
        <h2 style="justify-content:center;">${esc(t('cuenta.confirmCancelTitle'))}</h2>
        <div class="bugreport-guide" style="background:rgba(239,68,68,0.06);border-color:rgba(239,68,68,0.3);color:var(--text-secondary);">${esc(t('cuenta.confirmCancel'))}</div>
        <button class="btn btn-connect" type="button" id="cuentaCancelYes" style="width:100%;justify-content:center;margin-top:16px;">${esc(t('cuenta.confirmCancelYes'))}</button>
        <button class="btn btn-disconnect" type="button" id="cuentaCancelNo" style="width:100%;justify-content:center;margin-top:10px;">${esc(t('cuenta.confirmCancelNo'))}</button>
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
}
