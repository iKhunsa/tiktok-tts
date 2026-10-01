import { t } from '../../../nucleo/i18n/i18n.js';

export const etiquetaCampo = (campo) => t(`overlayCfg.campo.${campo.etiqueta || campo.clave}`);

export const tituloGrupo = (grupo) => t(`overlayCfg.grupo.${grupo}`);

// Solo se traducen las opciones declaradas en `opcionesTraducidas` (efectos,
// animaciones, "sistema"); los nombres de fuente se muestran tal cual.
export function etiquetaOpcion(campo, valor) {
  const traducida = (campo.opcionesTraducidas || []).includes(valor);
  return traducida ? t(`overlayCfg.opcion.${valor}`) : valor;
}

/** Texto del valor actual junto a la etiqueta de un slider (porcentaje o numero crudo). */
export const textoValor = (campo, valor) => (campo.porcentaje ? `${Math.round(valor * 100)}%` : String(valor));
