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

export function getSesion() {
  return almacenSesion.getState();
}

/** ¿esta feature esta disponible? Sin sistema de cuentas -> siempre si. */
export function estaDesbloqueada(featureId) {
  const s = almacenSesion.getState();
  if (!s.activo) return true;
  return s.entitlements.includes(featureId);
}

export const esPro = () => almacenSesion.getState().plan === 'pro';

function normalizar(data) {
  return {
    activo: true,
    signedIn: !!data.signedIn,
    user: data.user || null,
    plan: data.plan === 'pro' ? 'pro' : 'free',
    entitlements: Array.isArray(data.entitlements) ? data.entitlements : [],
    expiresAt: data.expiresAt || null,
    subscription: data.subscription || null,
    degraded: !!data.degraded,
  };
}

export function aplicarSesion(data) {
  almacenSesion.setState(normalizar(data || {}));
  pintarBadgeSidebar();
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

/** Badge "PRO" en Cuenta + candado en los items de modulos Pro bloqueados. */
export function pintarBadgeSidebar() {
  const s = almacenSesion.getState();

  const cuenta = document.querySelector('.sidebar-item[data-view="cuenta"]');
  if (cuenta) {
    let badge = cuenta.querySelector('.badge-pro');
    if (s.plan === 'pro' && !badge) {
      badge = document.createElement('span');
      badge.className = 'badge-new badge-pro';
      badge.textContent = 'PRO';
      cuenta.appendChild(badge);
    } else if (s.plan !== 'pro' && badge) {
      badge.remove();
    }
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
