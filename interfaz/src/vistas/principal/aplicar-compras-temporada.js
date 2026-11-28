import { SKINS_PREMIUM, alternarFavorita } from '../../../compartido/estilo/campos-chat.js';
import { SKINS_RANKING_PREMIUM } from '../../../compartido/estilo/campos-ranking.js';
import { SKINS_MUSICA_PREMIUM } from '../../../compartido/estilo/campos-musica.js';
import { appSettings, saveSettings, hidratarAjustesDesdeDisco } from '../../nucleo/estado/ajustes-app.js';
import { CLAVE_POR_APLICAR, hayComprasPorAplicar, tomarComprasPorAplicar } from '../../nucleo/estado/compras-overlays.js';
import { clavePorCuenta } from '../../nucleo/estado/datos-por-cuenta.js';
import { showToast } from '../../componentes/toast.js';
import { t } from '../../nucleo/i18n/i18n.js';

const TIPOS = [SKINS_MUSICA_PREMIUM, SKINS_PREMIUM, SKINS_RANKING_PREMIUM];

/** Suma cada overlay comprado a las favoritas de su tipo: asi sale en el selector de skins de su overlay. */
function aplicarCompras() {
  const compras = tomarComprasPorAplicar();
  if (!compras.length) return;
  for (const skin of compras) {
    const delTipo = TIPOS.find((tipo) => tipo.includes(skin));
    const favoritas = appSettings.skinsFavoritas;
    if (!delTipo || favoritas.includes(skin)) continue;
    appSettings.skinsFavoritas = alternarFavorita(favoritas, skin, delTipo) ?? favoritas;
    showToast(t('temporada.tienda.agregado', { skin: t(`overlayCfg.skins.${skin}`) }));
  }
  saveSettings();
}

/** Recoge las compras hechas en la ventana de temporada: las pendientes al arrancar y las nuevas al momento. */
export async function iniciarComprasTemporada() {
  window.addEventListener('storage', (evento) => {
    if (evento.key === clavePorCuenta(CLAVE_POR_APLICAR)) aplicarCompras();
  });
  if (!hayComprasPorAplicar()) return;
  await hidratarAjustesDesdeDisco(); // que la copia en disco no pise despues lo recien sumado
  aplicarCompras();
}
