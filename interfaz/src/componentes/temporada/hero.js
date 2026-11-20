/** Titulo y descripcion de una temporada: los comparten la bienvenida y la pestana de inicio de su ventana. */
export const htmlHero = (id, idTitulo = '') => `
  <h2${idTitulo ? ` id="${idTitulo}"` : ''} class="temporada-titulo">
    <span class="temporada-titulo-1" data-i18n="temporada.${id}.titulo1"></span>
    <span class="temporada-titulo-2" data-i18n="temporada.${id}.titulo2"></span>
  </h2>
  <p class="temporada-texto" data-i18n-html="temporada.${id}.descripcion"></p>`;
