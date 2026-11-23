// Reparto de los ajustes de un overlay en 5 categorias. Solo agrupa lo que ya existe: no cambia claves ni esquema.
export const CATEGORIAS = ['general', 'apariencia', 'animaciones', 'posicion', 'avanzado'];
export const SUBGRUPOS_AVANZADO = ['espaciado', 'bordes', 'texto', 'efectos'];

// `categoria` o `avanzado/<subgrupo>`; lo que no figura aqui se decide por su grupo del esquema.
const DESTINO_POR_CLAVE = {
  ...Object.fromEntries(['color', 'bg', 'fuente', 'peso', 'tamano', 'colorTexto', 'alineacionTexto', 'colorValor', 'colorRango', 'placa', 'colorPlaca'].map((clave) => [clave, 'apariencia'])),
  ...Object.fromEntries(['posicionH', 'posicionV', 'desplazaX', 'desplazaY', 'capaZ', 'rotaY', 'derechaAIzquierda'].map((clave) => [clave, 'posicion'])),
  ...Object.fromEntries(['interlineado', 'espaciadoLetras', 'espaciadoPalabras'].map((clave) => [clave, 'avanzado/espaciado'])),
  ...Object.fromEntries(['redondeo', 'contornoGrosor', 'contornoColor'].map((clave) => [clave, 'avanzado/bordes'])),
  ...Object.fromEntries(['mayusculas', 'cursiva', 'subrayado'].map((clave) => [clave, 'avanzado/texto'])),
  ...Object.fromEntries(['sombra', 'sombraColor', 'sombraDifuminado'].map((clave) => [clave, 'avanzado/efectos'])),
};

export const GRUPOS_DE_EFECTOS = ['usuario', 'viewer', 'moderador', 'suscriptor'];

function destinoDe(campo) {
  if (DESTINO_POR_CLAVE[campo.clave]) return DESTINO_POR_CLAVE[campo.clave];
  if (campo.grupo === 'animacion') return 'animaciones';
  if (campo.grupo === 'tipografia') return 'apariencia';
  if (GRUPOS_DE_EFECTOS.includes(campo.grupo)) return 'avanzado/efectos';
  return 'general';
}

/** `{ categoria, subgrupo }` de un campo, o null si no se muestra (ocultos y skin se tocan desde otro sitio). */
export function categoriaDe(campo) {
  if (campo.ui === 'oculto' || campo.grupo === 'skin') return null;
  const [categoria, subgrupo] = destinoDe(campo).split('/');
  return { categoria, subgrupo };
}
