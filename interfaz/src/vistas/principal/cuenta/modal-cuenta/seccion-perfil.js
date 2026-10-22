/**
 * Seccion Perfil del modal "Mi cuenta": banner + foto (Cloudinary), nombre,
 * nickname, Google y el bloque Cuenta (contrasena, cerrar sesion, eliminar).
 * Se re-pinta entera tras cada cambio de sesion (ver modal-cuenta/index.js).
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../../componentes/toast.js';
import { aplicarSesion } from '../../../../nucleo/estado/sesion.js';
import { obtenerAvatarPerfil } from '../../../../nucleo/estado/avatar-perfil.js';
import { escaparAtributo as esc } from '../../../../../compartido/escapar-html.js';
import { pedir, toastError } from '../api.js';
import { subirImagenDeCuenta } from '../cloudinary-upload.js';
import { abrirModalEliminarCuenta } from '../modal-eliminar-cuenta.js';
import {
  listaIdentidades, vincularGoogle, cerrarSesion, eliminarCuenta, eliminarCuentaGoogle,
} from '../acciones-cuenta.js';

const MB_MAX = { avatar: 5, banner: 10 };
// Nombre real que trae Google: el back todavia no lo manda en la sesion
// (user.nombreCompleto, lo conecta el back). Hasta entonces, placeholder
// generico i18n -- nunca un nombre real hardcodeado (le aparecia a CUALQUIER
// usuario sin Google vinculado, no solo a quien lo escribio).

function fila(labelKey, derecha) {
  return `<div class="mc-fila"><span class="mc-fila-label" data-i18n="${labelKey}"></span>${derecha}</div>`;
}

export function pintarPerfil(cont, s) {
  const u = s.user || {};
  const sub = s.subscription || {};
  const avatar = u.avatarUrl || obtenerAvatarPerfil();
  const inicial = esc((u.nombre || u.email || '?').trim().charAt(0).toUpperCase());
  // Con un plan de pago vivo el borrado pide cancelar antes (texto de la referencia).
  const conSuscripcion = s.plan !== 'free' && !sub.cancelAtPeriodEnd;

  cont.insertAdjacentHTML('beforeend', `
    <div class="mc-portada">
      <button class="mc-banner" type="button" data-tipo="banner" data-i18n-title="cuentaModal.changeBanner">
        ${u.bannerUrl ? `<img src="${esc(u.bannerUrl)}" alt="">` : ''}
      </button>
      <button class="mc-avatar" type="button" data-tipo="avatar" data-i18n-title="cuenta.changePhoto">
        ${avatar ? `<img src="${esc(avatar)}" alt="">` : `<span>${inicial}</span>`}
      </button>
      <input type="file" class="mc-archivo" accept="image/png,image/jpeg,image/webp" hidden>
    </div>
    <div class="mc-filas">
      ${fila('cuentaModal.fullName', `<span class="mc-valor">${esc(u.nombreCompleto || t('cuentaModal.fullNameUnknown'))}</span>`)}
      ${fila('cuenta.nickname', `<button class="mc-valor mc-valor-editable" type="button" id="mcNick">${u.nombre ? `@${esc(u.nombre)}` : ''}</button>`)}
      ${fila('cuentaModal.googleRow', '<span class="mc-google" id="mcGoogle"></span>')}
    </div>
    <h3 class="mc-subtitulo" data-i18n="cuentaModal.accountTitle"></h3>
    <div class="mc-filas">
      ${fila('cuentaModal.changePassword', '<button class="mc-accion" type="button" id="mcPassword" data-i18n="cuentaModal.update"></button>')}
      ${fila('cuentaModal.logoutRow', '<button class="mc-accion" type="button" id="mcLogout" data-i18n="cuenta.logout"></button>')}
      ${fila(conSuscripcion ? 'cuentaModal.deleteBlocked' : 'cuenta.deleteHint', '<button class="mc-eliminar" type="button" id="mcEliminar" data-i18n="cuenta.deleteAccount"></button>')}
    </div>`);
  aplicarTraducciones(cont);

  enlazarImagenes(cont);
  enlazarNick(cont, u);
  pintarGoogle(cont);

  // Sin endpoint todavia: la fila queda puesta para cuando exista.
  cont.querySelector('#mcPassword').addEventListener('click', () => showToast(t('cuentaModal.soon')));
  cont.querySelector('#mcLogout').addEventListener('click', cerrarSesion);
  cont.querySelector('#mcEliminar').addEventListener('click', async () => {
    const lista = await listaIdentidades();
    abrirModalEliminarCuenta({
      hasPassword: u.hasPassword !== false,
      googleLinked: lista.includes('google'),
      eliminar: eliminarCuenta,
      eliminarGoogle: eliminarCuentaGoogle,
    });
  });
}

function enlazarImagenes(cont) {
  const input = cont.querySelector('.mc-archivo');
  let tipo;
  for (const btn of cont.querySelectorAll('[data-tipo]')) {
    btn.addEventListener('click', () => { tipo = btn.dataset.tipo; input.click(); });
  }
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    const btn = cont.querySelector(`[data-tipo="${tipo}"]`);
    btn.classList.add('is-loading');
    btn.disabled = true;
    const r = await subirImagenDeCuenta(tipo, file);
    if (!btn.isConnected) return;
    btn.classList.remove('is-loading');
    btn.disabled = false;
    if (r.ok) return aplicarSesion(r.sesion); // re-pinta la seccion con la URL nueva
    if (r.motivo === 'formato') showToast(t('cuentaModal.uploadFormat'));
    else if (r.motivo === 'tamano') showToast(t('cuentaModal.uploadSize', { mb: MB_MAX[tipo] }));
    else toastError(r.body, 'cuenta.photoError');
  });
}

// Clic en el valor -> input en el mismo lugar. Enter guarda, Escape cancela.
function enlazarNick(cont, u) {
  const valor = cont.querySelector('#mcNick');
  valor.addEventListener('click', () => {
    const input = document.createElement('input');
    input.className = 'mc-input';
    input.value = u.nombre || '';
    input.maxLength = 40;
    input.setAttribute('aria-label', t('cuenta.nickname'));
    valor.replaceWith(input);
    input.focus();
    input.select();
    let hecho = false;
    const terminar = async (guardar) => {
      if (hecho) return;
      hecho = true;
      const nombre = input.value.trim();
      if (!guardar || nombre === (u.nombre || '')) return input.replaceWith(valor);
      input.disabled = true;
      const r = await pedir('/api/account', { method: 'PATCH', body: { nombre } });
      if (!r.ok) {
        toastError(r.body);
        return input.replaceWith(valor);
      }
      showToast(t('cuenta.saved'));
      aplicarSesion(r.body);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') terminar(true);
      if (e.key === 'Escape') { e.stopPropagation(); terminar(false); } // cancela la edicion, no cierra el modal
    });
    input.addEventListener('blur', () => terminar(true));
  });
}

async function pintarGoogle(cont) {
  const slot = cont.querySelector('#mcGoogle');
  const lista = await listaIdentidades();
  if (!slot.isConnected) return;
  if (lista.includes('google')) {
    slot.innerHTML = `<span class="mc-valor">${esc(t('cuentaModal.linked'))}</span>`;
    return;
  }
  slot.innerHTML = `<button class="mc-btn-google" type="button"><img src="icons/google.svg" alt="">${esc(t('cuentaModal.link'))}</button>`;
  const btn = slot.querySelector('button');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    if (await vincularGoogle()) pintarGoogle(cont);
    else btn.disabled = false;
  });
}
