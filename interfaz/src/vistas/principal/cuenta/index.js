/**
 * Vista "Cuenta": registro / login / perfil / plan. Espejo del patron de
 * mcp/index.js — el panel se pinta al entrar a la vista y tras cada cambio
 * de sesion. Toda la logica de plan/entitlements vive en el server
 * (features/auth/); aca solo se refleja el estado y se disparan acciones.
 */
import { t, tErr, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { almacenSesion, aplicarSesion } from '../../../nucleo/estado/sesion.js';

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

let modo = 'login'; // 'login' | 'register' — solo cuando esta deslogueado

function formAuth() {
  const esReg = modo === 'register';
  return `
    <div class="settings-section">
      <div class="settings-section-title">
        <span data-i18n="${esReg ? 'cuenta.registerTitle' : 'cuenta.loginTitle'}"></span>
      </div>
      <div class="settings-panel">
        <div class="setting-group">
          <label data-i18n="cuenta.email">Email</label>
          <input type="email" id="cuentaEmail" autocomplete="email">
        </div>
        <div class="setting-group">
          <label data-i18n="cuenta.password">Contraseña</label>
          <input type="password" id="cuentaPass" autocomplete="${esReg ? 'new-password' : 'current-password'}">
        </div>
        ${esReg ? `
        <div class="setting-group">
          <label data-i18n="cuenta.name">Nombre</label>
          <input type="text" id="cuentaNombre" autocomplete="nickname">
        </div>` : ''}
        <div class="setting-group">
          <button class="cfg-btn" id="cuentaSubmit" data-i18n="${esReg ? 'cuenta.doRegister' : 'cuenta.doLogin'}"></button>
          <button class="cfg-btn small" id="cuentaSwitch" data-i18n="${esReg ? 'cuenta.haveAccount' : 'cuenta.noAccount'}"></button>
        </div>
      </div>
    </div>`;
}

function planLinea(s) {
  if (s.plan === 'pro') {
    const sub = s.subscription || {};
    const hasta = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '';
    const clave = sub.cancelAtPeriodEnd ? 'cuenta.planProCancels' : 'cuenta.planProUntil';
    return `<img class="icon-inline" src="icons/workspace_premium.svg" alt=""> ${t(clave, { fecha: hasta })}`;
  }
  return `${t('cuenta.planFree')}`;
}

function panelPerfil(s) {
  const u = s.user || {};
  const degradado = s.degraded
    ? `<div class="mcp-hint" data-i18n="cuenta.degraded">No pudimos verificar tu plan con el servidor; usando el último estado conocido.</div>` : '';
  return `
    <div class="settings-section">
      <div class="settings-section-title"><span data-i18n="cuenta.profileTitle">Perfil</span></div>
      <div class="settings-panel">
        <div class="setting-group">
          <label data-i18n="cuenta.email">Email</label>
          <code>${u.email || ''}</code>
        </div>
        <div class="setting-group">
          <label data-i18n="cuenta.name">Nombre</label>
          <input type="text" id="cuentaNombre" value="${(u.nombre || '').replace(/"/g, '&quot;')}">
          <button class="cfg-btn small" id="cuentaGuardarNombre" data-i18n="cuenta.save">Guardar</button>
        </div>
        <div class="setting-group">
          <button class="cfg-btn small" id="cuentaLogout" data-i18n="cuenta.logout">Cerrar sesión</button>
        </div>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title"><span data-i18n="cuenta.planTitle">Plan</span></div>
      <div class="settings-panel">
        <div class="setting-group"><div>${planLinea(s)}</div></div>
        ${degradado}
        <div class="setting-group">
          ${s.plan === 'pro'
    ? `<button class="cfg-btn" id="cuentaManage" data-i18n="cuenta.manage">Gestionar suscripción</button>`
    : `<button class="cfg-btn" id="cuentaUpgrade" data-i18n="cuenta.goPro">Hazte Pro</button>`}
        </div>
      </div>
    </div>`;
}

export function renderCuentaPanel() {
  const el = document.getElementById('cuentaPanel');
  if (!el) return;
  const s = almacenSesion.getState();

  if (!s.activo) {
    el.innerHTML = `<div class="settings-section"><div class="mcp-hint" data-i18n="cuenta.inactive">El sistema de cuentas no está habilitado en esta versión.</div></div>`;
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
    el.querySelector('#cuentaSubmit').addEventListener('click', enviarAuth);
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
  const up = el.querySelector('#cuentaUpgrade') || el.querySelector('#cuentaManage');
  if (up) up.addEventListener('click', irACheckout);
}

async function enviarAuth() {
  const email = document.getElementById('cuentaEmail').value.trim();
  const password = document.getElementById('cuentaPass').value;
  const nombreEl = document.getElementById('cuentaNombre');
  const path = modo === 'register' ? '/api/auth/register' : '/api/auth/login';
  const body = { email, password };
  if (modo === 'register' && nombreEl) body.nombre = nombreEl.value.trim();
  const r = await pedir(path, { method: 'POST', body });
  if (!r.ok) return toastError(r.body, 'errors.invalidCredentials');
  aplicarSesion(r.body);
  renderCuentaPanel();
}

async function irACheckout() {
  const r = await pedir('/api/auth/checkout', { method: 'POST', body: { plan: 'pro' } });
  if (!r.ok || !r.body.url) return toastError(r.body);
  window.open(r.body.url, '_blank'); // window.js rebota la URL no-local al navegador externo
  showToast(t('cuenta.checkoutOpened'));
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
