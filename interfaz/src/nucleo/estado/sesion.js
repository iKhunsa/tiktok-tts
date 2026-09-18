/**
 * Estado de sesion (cuentas + suscripcion). Espejo de config-runtime.js:
 * fuente de verdad = servidor (features/auth/), hidratado desde
 * /api/auth/session al arrancar y desde el WS (auth-updated) en cada cambio.
 *
 * Con subscriptionsEnabled=false en el server, /api/auth/session devuelve 404
 * -> la app queda en "sin sistema de cuentas", todo desbloqueado, sin UI de
 * cuenta. Es el comportamiento por defecto.
 */
import { crearAlmacen } from './crear-almacen.js';
import { t } from '../i18n/i18n.js';
import { abrirPopupPlanes } from '../../componentes/popup-planes.js';
import { toggleAccountPopover } from '../../componentes/popover-cuenta.js';
import { obtenerAvatarPerfil } from './avatar-perfil.js';

export const almacenSesion = crearAlmacen({
  activo: false, // ¿el server tiene subscriptionsEnabled? (404 => false)
  signedIn: false,
  user: null,
  plan: 'free',
  entitlements: [],
  expiresAt: null,
  subscription: null,
  degraded: false,
});

/** Con el sistema de cuentas activo, nadie usa la app sin sesión: hay que
 * registrarse o iniciar sesión. Con el sistema apagado (flag off / sin
 * CUENTAS_URL) nunca bloquea — la app funciona como siempre. */
export const appBloqueada = () => {
  const s = almacenSesion.getState();
  return s.activo && !s.signedIn;
};

function normalizar(data) {
  return {
    activo: true,
    signedIn: !!data.signedIn,
    user: data.user || null,
    plan: ['pro', 'sin-promos'].includes(data.plan) ? data.plan : 'free',
    entitlements: Array.isArray(data.entitlements) ? data.entitlements : [],
    expiresAt: data.expiresAt || null,
    subscription: data.subscription || null,
    degraded: !!data.degraded,
  };
}

export function aplicarSesion(data) {
  almacenSesion.setState(normalizar(data || {}));
}

/** Carga inicial. 404 => el server no tiene el sistema activo. */
export async function cargarSesion() {
  try {
    const r = await fetch('/api/auth/session');
    if (r.status === 404) {
      almacenSesion.setState({ activo: false });
      return;
    }
    if (!r.ok) { almacenSesion.setState({ activo: true, degraded: true }); return; }
    aplicarSesion(await r.json());
  } catch (_) {
    almacenSesion.setState({ activo: true, degraded: true });
  }
}

// Vista de sidebar -> featureId Pro. Solo las que son un modulo entero.
const VISTA_FEATURE = {
  bot: 'bot-musical',
  soundpad: 'soundpad',
  mobile: 'panel-movil',
  clips: 'clips',
  mcp: 'mcp-agente',
};

/** Bloque de Cuenta + candados en los items de modulos Pro bloqueados. */
export function pintarBadgeSidebar() {
  const s = almacenSesion.getState();

  const cuenta = document.querySelector('.sidebar-item[data-view="cuenta"]');
  if (cuenta) {
    const planKey = s.plan === 'pro' ? 'Pro' : s.plan === 'sin-promos' ? 'SinPromos' : 'Free';
    const copy = (selector, key) => {
      const el = cuenta.querySelector(selector);
      if (!el) return;
      el.dataset.i18n = key;
      el.textContent = t(key);
    };
    copy('.sidebar-account-title span', 'nav.cuenta');
    copy('.sidebar-account-badge', `sidebarAccount.badge${planKey}`);
    copy('.sidebar-account-subtitle', `sidebarAccount.subtitle${planKey}`);
    copy('.sidebar-account-cta span', s.plan === 'free' ? 'sidebarAccount.upgrade' : 'sidebarAccount.managePlan');
    const avatar = obtenerAvatarPerfil();
    const icono = cuenta.querySelector('.sidebar-account-title > img.icon-inline');
    if (icono) {
      icono.src = avatar || 'icons/account_circle.svg';
      icono.classList.toggle('sidebar-account-avatar', !!avatar);
    }
    cuenta.querySelector('.sidebar-account-cta img').hidden = s.plan !== 'free';
    const cta = cuenta.querySelector('.sidebar-account-cta');
    cuenta.onclick = () => toggleAccountPopover(cuenta);
    cta.onclick = s.plan === 'free'
      ? (event) => { event.stopPropagation(); abrirPopupPlanes(); }
      : null;
  }

  for (const [vista, featureId] of Object.entries(VISTA_FEATURE)) {
    const btn = document.querySelector(`.sidebar-item[data-view="${vista}"]`);
    if (!btn) continue;
    const bloqueada = s.activo && !s.entitlements.includes(featureId);
    let lock = btn.querySelector('.sidebar-lock');
    if (bloqueada && !lock) {
      lock = document.createElement('img');
      lock.className = 'sidebar-lock icon-inline';
      lock.src = 'icons/lock.svg';
      lock.alt = '';
      btn.appendChild(lock);
    } else if (!bloqueada && lock) {
      lock.remove();
    }
  }
}

/** Puente global legacy para el bloque Cuenta. */
export function abrirCuentaDesdeSidebar() {
  const cuenta = document.querySelector('.sidebar-item[data-view="cuenta"]');
  if (cuenta) toggleAccountPopover(cuenta);
}

almacenSesion.subscribe(pintarBadgeSidebar);
