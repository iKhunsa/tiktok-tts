import { t } from '../../../nucleo/i18n/i18n.js';

export const etiquetaCampo = (campo) => t(`overlayCfg.campo.${campo.etiqueta || campo.clave}`);

export const tituloGrupo = (grupo) => t(`overlayCfg.grupo.${grupo}`);

export const tituloSubgrupo = (subgrupo) => t(`overlayCfg.subgrupo.${subgrupo}`);

// Solo se traducen las opciones declaradas en `opcionesTraducidas` (efectos,
// animaciones, "sistema"); los nombres de fuente se muestran tal cual.
export function etiquetaOpcion(campo, valor) {
  const traducida = (campo.opcionesTraducidas || []).includes(valor);
  return traducida ? t(`overlayCfg.opcion.${valor}`) : valor;
}

/** Texto del valor actual junto a la etiqueta de un slider (porcentaje o numero crudo). */
/** Las duraciones se guardan en milisegundos pero se muestran en segundos: casi nadie piensa en ms. */
export const enInterfaz = (campo, valor) => (campo.segundos ? valor / 1000 : valor);

export function textoValor(campo, valor) {
  if (campo.porcentaje) return `${Math.round(valor * 100)}%`;
  return campo.segundos ? `${enInterfaz(campo, valor)} s` : String(valor);
}
